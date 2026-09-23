import { timingSafeEqual } from 'node:crypto'
import { after, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  recordEndOfCall,
  recordStatusUpdate,
  summarizeAndStore,
  type EndOfCallReportMessage,
  type StatusUpdateMessage,
} from '@/lib/calls/record'
import { handleToolCalls, type ToolCallsMessage } from '@/lib/vapi/tools'

// Leaves time for the Claude summary that runs after the response is sent
export const maxDuration = 60

// =============================================================================
// Vapi server webhook — Vapi POSTs call events here.
// Authenticated by the shared secret header we configure on every assistant
// and phone number (x-evano-secret).
// =============================================================================

type VapiServerMessage =
  | StatusUpdateMessage
  | EndOfCallReportMessage
  | { type: 'assistant-request'; phoneNumber?: { id?: string }; call?: { phoneNumberId?: string } }
  | { type: string }

function isAuthorized(request: Request): boolean {
  const expected = process.env.VOICE_PROVIDER_WEBHOOK_SECRET
  const received = request.headers.get('x-evano-secret')
  if (!expected || !received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { message?: VapiServerMessage } | null
  const message = body?.message
  if (!message?.type) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  switch (message.type) {
    // A call is ringing / in progress → show it on the dashboard immediately
    case 'status-update': {
      await recordStatusUpdate(message as StatusUpdateMessage)
      return NextResponse.json({ received: true })
    }

    // Call finished → save transcript, recording, duration; summarise afterwards
    case 'end-of-call-report': {
      const saved = await recordEndOfCall(message as EndOfCallReportMessage)
      if (saved) {
        after(() => summarizeAndStore(saved.callRowId, saved.orgId, saved.transcript))
      }
      return NextResponse.json({ received: true, saved: Boolean(saved) })
    }

    // The receptionist is using a tool mid-call (availability / booking)
    case 'tool-calls': {
      return NextResponse.json(await handleToolCalls(message as ToolCallsMessage))
    }

    // Sent when a number has no assistant attached — i.e. the receptionist is paused
    case 'assistant-request': {
      const m = message as { phoneNumber?: { id?: string }; call?: { phoneNumberId?: string } }
      const vapiNumberId = m.phoneNumber?.id ?? m.call?.phoneNumberId
      const db = createAdminClient()
      const { data: phone } = vapiNumberId
        ? await db.from('phone_numbers').select('organization_id').eq('provider_number_id', vapiNumberId).maybeSingle()
        : { data: null }
      const { data: org } = phone
        ? await db.from('organizations').select('name').eq('id', phone.organization_id).single()
        : { data: null }

      // Vapi speaks `error` to the caller and ends the call
      return NextResponse.json({
        error: `Thank you for calling${org?.name ? ` ${org.name}` : ''}. We can't take your call right now — please try again later.`,
      })
    }

    default:
      return NextResponse.json({ received: true })
  }
}
