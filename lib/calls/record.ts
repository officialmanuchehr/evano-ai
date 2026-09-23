import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import { summarizeCall, type TranscriptLine } from '@/lib/ai/call-summary'
import type { Json } from '@/types/database'
import { LANGUAGES } from '@/lib/agent/constants'

// =============================================================================
// Persist Vapi call events into public.calls (service role — webhook context).
// Shapes verified against Vapi's ServerMessageStatusUpdate /
// ServerMessageEndOfCallReport schemas.
// =============================================================================

type VapiCall = {
  id?: string
  assistantId?: string
  phoneNumberId?: string
  customer?: { number?: string }
  startedAt?: string
}

type VapiArtifactMessage = { role?: string; message?: string; secondsFromStart?: number }

export type StatusUpdateMessage = { type: 'status-update'; status?: string; call?: VapiCall }

export type EndOfCallReportMessage = {
  type: 'end-of-call-report'
  endedReason?: string
  startedAt?: string
  endedAt?: string
  call?: VapiCall
  customer?: { number?: string }
  artifact?: {
    messages?: VapiArtifactMessage[]
    recordingUrl?: string
    recording?: { mono?: { combinedUrl?: string } }
  }
}

type CallStatus = 'in_progress' | 'completed' | 'missed' | 'failed' | 'transferred'

/** Find the org (and agent/phone rows) a Vapi call belongs to. */
export async function resolveOwner(call: VapiCall | undefined) {
  const db = createAdminClient()
  if (call?.assistantId) {
    const { data } = await db
      .from('ai_agents')
      .select('id, organization_id')
      .eq('provider_agent_id', call.assistantId)
      .maybeSingle()
    if (data) {
      const { data: phone } = call.phoneNumberId
        ? await db.from('phone_numbers').select('id').eq('provider_number_id', call.phoneNumberId).maybeSingle()
        : { data: null }
      return { orgId: data.organization_id, agentId: data.id, phoneId: phone?.id ?? null }
    }
  }
  if (call?.phoneNumberId) {
    const { data } = await db
      .from('phone_numbers')
      .select('id, organization_id, agent_id')
      .eq('provider_number_id', call.phoneNumberId)
      .maybeSingle()
    if (data) return { orgId: data.organization_id, agentId: data.agent_id, phoneId: data.id }
  }
  return null
}

export function mapEndedReason(reason: string | undefined, callerSpoke: boolean): CallStatus {
  const r = reason ?? ''
  if (r.includes('forwarded')) return 'transferred'
  if (r.includes('error') || r.includes('failed') || r.startsWith('call.start')) return 'failed'
  if (!callerSpoke || r === 'customer-did-not-answer' || r === 'customer-busy') return 'missed'
  return 'completed'
}

/** Vapi artifact messages → our transcript lines (drops system/tool messages). */
export function toTranscript(messages: VapiArtifactMessage[] | undefined): TranscriptLine[] {
  return (messages ?? [])
    .filter((m) => (m.role === 'bot' || m.role === 'assistant' || m.role === 'user') && m.message?.trim())
    .map((m) => ({ role: m.role === 'user' ? 'caller' : 'assistant', text: m.message!.trim() }))
}

// ------------------------------------------------------------------ status

/** A call started ringing / is in progress → show it on the dashboard right away. */
export async function recordStatusUpdate(msg: StatusUpdateMessage) {
  if (msg.status !== 'in-progress' || !msg.call?.id) return
  const owner = await resolveOwner(msg.call)
  if (!owner) return

  await createAdminClient()
    .from('calls')
    .upsert(
      {
        organization_id: owner.orgId,
        agent_id: owner.agentId,
        phone_number_id: owner.phoneId,
        provider_call_id: msg.call.id,
        caller_number: msg.call.customer?.number ?? null,
        started_at: msg.call.startedAt ?? new Date().toISOString(),
        status: 'in_progress',
      },
      { onConflict: 'provider_call_id', ignoreDuplicates: true }
    )
}

// ------------------------------------------------------------- end of call

/**
 * Save the finished call. Returns what the caller needs to run the (slower)
 * Claude summary afterwards, or null if the call couldn't be matched to an org.
 */
export async function recordEndOfCall(msg: EndOfCallReportMessage) {
  const callId = msg.call?.id
  if (!callId) return null
  const owner = await resolveOwner(msg.call)
  if (!owner) {
    console.warn('[calls] end-of-call-report for unknown assistant/number', { callId })
    return null
  }

  const transcript = toTranscript(msg.artifact?.messages)
  const startedAt = msg.startedAt ?? msg.call?.startedAt ?? null
  const endedAt = msg.endedAt ?? null
  const duration =
    startedAt && endedAt ? Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000)) : null
  const status = mapEndedReason(msg.endedReason, transcript.some((l) => l.role === 'caller'))

  const db = createAdminClient()
  const { data: row, error } = await db
    .from('calls')
    .upsert(
      {
        organization_id: owner.orgId,
        agent_id: owner.agentId,
        phone_number_id: owner.phoneId,
        provider_call_id: callId,
        caller_number: msg.customer?.number ?? msg.call?.customer?.number ?? null,
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: duration,
        status,
        transcript: transcript as unknown as Json,
        recording_url: msg.artifact?.recording?.mono?.combinedUrl ?? msg.artifact?.recordingUrl ?? null,
      },
      { onConflict: 'provider_call_id' }
    )
    .select('id')
    .single()

  if (error || !row) {
    console.error('[calls] save failed', error?.message)
    return null
  }

  await bumpUsage(owner.orgId, startedAt, duration)
  return { callRowId: row.id, orgId: owner.orgId, transcript }
}

/** Add this call to the org's monthly usage counters. */
async function bumpUsage(orgId: string, startedAt: string | null, durationSeconds: number | null) {
  const db = createAdminClient()
  const d = startedAt ? new Date(startedAt) : new Date()
  const periodStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10)
  const periodEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
  const minutes = Math.ceil((durationSeconds ?? 0) / 60)

  const { data: existing } = await db
    .from('usage')
    .select('id, calls_count, voice_minutes')
    .eq('organization_id', orgId)
    .eq('period_start', periodStart)
    .maybeSingle()

  if (existing) {
    await db
      .from('usage')
      .update({ calls_count: existing.calls_count + 1, voice_minutes: existing.voice_minutes + minutes })
      .eq('id', existing.id)
  } else {
    await db.from('usage').insert({
      organization_id: orgId,
      period_start: periodStart,
      period_end: periodEnd,
      calls_count: 1,
      voice_minutes: minutes,
    })
  }
}

/** Claude summary + purpose — run via after() so Vapi isn't kept waiting. */
export async function summarizeAndStore(callRowId: string, orgId: string, transcript: TranscriptLine[]) {
  const db = createAdminClient()
  const [{ data: org }, { data: agent }] = await Promise.all([
    db.from('organizations').select('name').eq('id', orgId).single(),
    db.from('ai_agents').select('language').eq('organization_id', orgId).maybeSingle(),
  ])
  // Summarise in the language the receptionist speaks (e.g. Russian for ru-RU)
  const language = agent?.language?.startsWith('ru') ? 'Russian' : LANGUAGES.find((l) => l.value === agent?.language)?.label.split(' ')[0] ?? 'English'
  try {
    const result = await summarizeCall(transcript, org?.name ?? 'the business', language)
    if (!result) return
    const summary = result.follow_up_needed ? `${result.summary} Follow-up needed.` : result.summary
    await db.from('calls').update({ summary, purpose: result.purpose }).eq('id', callRowId)
  } catch (err) {
    console.error('[calls] summary failed', err)
  }
}
