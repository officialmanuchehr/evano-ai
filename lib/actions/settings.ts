'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { applyBusinessDetails, applyHours } from '@/lib/business/update'
import { refreshAssistantIfExists } from '@/lib/vapi/sync'
import { getI18n } from '@/lib/i18n/server'
import type { ActionResult } from '@/lib/actions/auth'

// =============================================================================
// Settings page actions. Business/hours changes also refresh the live
// receptionist, since it quotes both on calls.
// =============================================================================

export type SettingsResult = ActionResult & { warning?: string }

async function requireAuth() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  return auth
}

export async function updateBusinessSettingsAction(formData: FormData): Promise<SettingsResult> {
  const { t } = await getI18n()
  const { profile } = await requireAuth()
  const result = await applyBusinessDetails(profile.organization_id, formData, t.errors)
  if (!result.success) return result

  const warning = (await refreshAssistantIfExists(profile.organization_id)) ? undefined : t.knowledge.syncWarning
  revalidatePath('/dashboard', 'layout')
  return { success: true, warning }
}

export async function updateHoursSettingsAction(formData: FormData): Promise<SettingsResult> {
  const { t } = await getI18n()
  const { profile } = await requireAuth()
  const result = await applyHours(profile.organization_id, formData, t.errors)
  if (!result.success) return result

  const warning = (await refreshAssistantIfExists(profile.organization_id)) ? undefined : t.knowledge.syncWarning
  revalidatePath('/dashboard', 'layout')
  return { success: true, warning }
}

export async function updateProfileAction(formData: FormData): Promise<SettingsResult> {
  const { t } = await getI18n()
  const { user } = await requireAuth()
  const parsed = z.string().trim().min(2, t.errors.nameMin).max(120).safeParse(formData.get('fullName') ?? '')
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  // Column grants only allow users to change their own name (and onboarding flag)
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ full_name: parsed.data }).eq('id', user.id)
  if (error) {
    console.error('[settings.profile]', error.message)
    return { success: false, error: t.errors.generic }
  }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function changePasswordAction(formData: FormData): Promise<SettingsResult> {
  const { t } = await getI18n()
  await requireAuth()
  const e = t.errors
  const parsed = z
    .object({
      password: z.string().min(8, e.passwordMin).regex(/[A-Z]/, e.passwordUpper).regex(/[0-9]/, e.passwordNumber),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, { message: e.passwordsMismatch, path: ['confirm'] })
    .safeParse({ password: formData.get('password') ?? '', confirm: formData.get('confirm') ?? '' })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    console.error('[settings.password]', error.message)
    const sameAsOld = error.message.toLowerCase().includes('different from the old')
    return { success: false, error: sameAsOld ? e.samePassword : e.updatePasswordFailed }
  }
  return { success: true }
}
