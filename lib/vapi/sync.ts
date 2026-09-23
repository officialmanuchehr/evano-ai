import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import { buildAssistantPayload, type AssistantSource } from '@/lib/vapi/assistant'
import { createAssistant, getAssistant, updateAssistant, VapiError } from '@/lib/vapi/client'

// =============================================================================
// Keep an organization's Vapi assistant in sync with its settings.
//
// `orgId` must come from the signed-in session — never from the browser.
// The admin client is used because provider ids are server-owned fields.
// =============================================================================

export function webhookConfig() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const secret = process.env.VOICE_PROVIDER_WEBHOOK_SECRET
  if (!appUrl || !secret) throw new Error('NEXT_PUBLIC_APP_URL and VOICE_PROVIDER_WEBHOOK_SECRET must be set')
  return { webhookUrl: `${appUrl}/api/vapi/webhook`, webhookSecret: secret }
}

async function loadSource(orgId: string): Promise<AssistantSource & { providerAgentId: string | null }> {
  const db = createAdminClient()
  const [org, agent, info, hours, faqs] = await Promise.all([
    db.from('organizations').select('id, name, industry, timezone').eq('id', orgId).single(),
    db
      .from('ai_agents')
      .select('id, name, greeting, tone, response_length, language, system_prompt, voice_id, provider_agent_id')
      .eq('organization_id', orgId)
      .single(),
    db
      .from('business_info')
      .select('description, address, website, phone, email, services, after_hours_behavior, transfer_number')
      .eq('organization_id', orgId)
      .maybeSingle(),
    db.from('business_hours').select('day_of_week, is_closed, open_time, close_time').eq('organization_id', orgId),
    db.from('faqs').select('question, answer').eq('organization_id', orgId).eq('is_active', true).order('created_at'),
  ])

  if (!org.data || !agent.data) throw new Error(`Organization ${orgId} has no agent`)
  const { provider_agent_id, ...agentFields } = agent.data

  return {
    org: org.data,
    agent: agentFields,
    info: info.data,
    hours: hours.data ?? [],
    faqs: faqs.data ?? [],
    providerAgentId: provider_agent_id,
  }
}

/**
 * Create the org's Vapi assistant if missing, otherwise update it.
 * Returns the Vapi assistant id.
 */
export async function syncAssistant(orgId: string): Promise<string> {
  const { providerAgentId, ...source } = await loadSource(orgId)
  const payload = buildAssistantPayload(source, webhookConfig())

  if (providerAgentId) {
    try {
      // Only update an assistant that was created for this organization
      const existing = await getAssistant(providerAgentId)
      if (existing.metadata?.organizationId === orgId) {
        await updateAssistant(providerAgentId, payload)
        return providerAgentId
      }
      console.warn('[vapi.sync] assistant org mismatch — creating a new one', { orgId, providerAgentId })
    } catch (err) {
      // Deleted in Vapi → fall through and recreate
      if (!(err instanceof VapiError && err.status === 404)) throw err
    }
  }

  const created = await createAssistant(payload)
  const { error } = await createAdminClient()
    .from('ai_agents')
    .update({ provider_agent_id: created.id })
    .eq('organization_id', orgId)
  if (error) throw new Error(`Could not save Vapi assistant id: ${error.message}`)

  return created.id
}

/**
 * After the owner changes something the receptionist relies on: refresh the
 * Vapi assistant if one exists. Returns false only if a refresh was needed and
 * failed (callers show a non-blocking warning).
 */
export async function refreshAssistantIfExists(orgId: string): Promise<boolean> {
  const { data: agent } = await createAdminClient()
    .from('ai_agents')
    .select('provider_agent_id')
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!agent?.provider_agent_id) return true
  try {
    await syncAssistant(orgId)
    return true
  } catch (err) {
    console.error('[vapi.refresh]', err)
    return false
  }
}
