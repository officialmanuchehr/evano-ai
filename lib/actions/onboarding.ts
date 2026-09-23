'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/actions/auth'
import { getI18n } from '@/lib/i18n/server'
import { applyBusinessDetails, applyHours } from '@/lib/business/update'
import { faqsSchema, parseJsonField, servicesSchema } from '@/lib/knowledge/schemas'

// =============================================================================
// Onboarding wizard actions (validation/saving shared with Settings)
// =============================================================================

/** Resolve the caller's org from their session — never trust org ids from the form. */
async function requireOrg() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  return { orgId: auth.profile.organization_id, userId: auth.user.id }
}

// STEP 1 — Business details
export async function saveBusinessAction(formData: FormData): Promise<ActionResult> {
  const { t } = await getI18n()
  const { orgId } = await requireOrg()
  const result = await applyBusinessDetails(orgId, formData, t.errors)
  if (!result.success) return result
  redirect('/onboarding/hours')
}

// STEP 2 — Business hours + after-hours behavior
export async function saveHoursAction(formData: FormData): Promise<ActionResult> {
  const { t } = await getI18n()
  const { orgId } = await requireOrg()
  const result = await applyHours(orgId, formData, t.errors)
  if (!result.success) return result
  redirect('/onboarding/services')
}

// STEP 3 — Services + FAQs, then finish onboarding
export async function completeOnboardingAction(formData: FormData): Promise<ActionResult> {
  const { t } = await getI18n()
  const services = servicesSchema.safeParse(parseJsonField(formData, 'services'))
  if (!services.success) return { success: false, error: t.errors.servicesInvalid }
  const faqs = faqsSchema.safeParse(parseJsonField(formData, 'faqs'))
  if (!faqs.success) return { success: false, error: t.errors.faqsInvalid }

  const { orgId, userId } = await requireOrg()
  const supabase = await createClient()

  const { error: infoError } = await supabase.from('business_info').update({ services: services.data }).eq('organization_id', orgId)

  // Onboarding can be revisited with "Back" — replace FAQs rather than append
  const { error: deleteError } = await supabase.from('faqs').delete().eq('organization_id', orgId)
  const { error: faqError } = faqs.data.length
    ? await supabase.from('faqs').insert(faqs.data.map((f) => ({ ...f, organization_id: orgId })))
    : { error: null }

  const { error: profileError } = await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId)

  const failed = infoError ?? deleteError ?? faqError ?? profileError
  if (failed) {
    console.error('[onboarding.complete]', failed.message)
    return { success: false, error: t.errors.finishFailed }
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}
