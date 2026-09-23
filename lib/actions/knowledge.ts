'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient, createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { faqsSchema, parseJsonField, servicesSchema } from '@/lib/knowledge/schemas'
import { syncAssistant } from '@/lib/vapi/sync'
import { getI18n } from '@/lib/i18n/server'
import type { ActionResult } from '@/lib/actions/auth'

// =============================================================================
// Knowledge page — edit services and FAQs after onboarding.
// After saving, the live Vapi assistant is refreshed (if one exists) so the
// receptionist uses the new answers on the very next call.
// =============================================================================

export type KnowledgeResult = ActionResult & { warning?: string }

async function requireOrgId() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  return auth.profile.organization_id
}

/** Push changes to the live receptionist; a failure is reported as a warning, not an error. */
async function refreshReceptionist(orgId: string, warning: string): Promise<string | undefined> {
  const { data: agent } = await createAdminClient()
    .from('ai_agents')
    .select('provider_agent_id')
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!agent?.provider_agent_id) return undefined
  try {
    await syncAssistant(orgId)
    return undefined
  } catch (err) {
    console.error('[knowledge.sync]', err)
    return warning
  }
}

export async function saveServicesAction(formData: FormData): Promise<KnowledgeResult> {
  const { t } = await getI18n()
  const services = servicesSchema.safeParse(parseJsonField(formData, 'services'))
  if (!services.success) return { success: false, error: t.errors.servicesInvalid }

  const orgId = await requireOrgId()
  const supabase = await createClient()
  const { error } = await supabase.from('business_info').update({ services: services.data }).eq('organization_id', orgId)
  if (error) {
    console.error('[knowledge.services]', error.message)
    return { success: false, error: t.errors.generic }
  }

  const warning = await refreshReceptionist(orgId, t.knowledge.syncWarning)
  revalidatePath('/dashboard', 'layout')
  return { success: true, warning }
}

export async function saveFaqsAction(formData: FormData): Promise<KnowledgeResult> {
  const { t } = await getI18n()
  const faqs = faqsSchema.safeParse(parseJsonField(formData, 'faqs'))
  if (!faqs.success) return { success: false, error: t.errors.faqsInvalid }

  const orgId = await requireOrgId()
  const supabase = await createClient()

  // Replace the whole list — simple, and keeps the order the owner sees
  const { error: deleteError } = await supabase.from('faqs').delete().eq('organization_id', orgId)
  const { error: insertError } = faqs.data.length
    ? await supabase.from('faqs').insert(faqs.data.map((f) => ({ ...f, organization_id: orgId })))
    : { error: null }
  if (deleteError || insertError) {
    console.error('[knowledge.faqs]', (deleteError ?? insertError)?.message)
    return { success: false, error: t.errors.generic }
  }

  const warning = await refreshReceptionist(orgId, t.knowledge.syncWarning)
  revalidatePath('/dashboard', 'layout')
  return { success: true, warning }
}
