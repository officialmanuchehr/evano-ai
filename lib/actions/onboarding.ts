'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { TIMEZONES, INDUSTRIES } from '@/lib/onboarding/constants'
import type { ActionResult } from '@/lib/actions/auth'
import { defaultGreeting, isDefaultGreeting } from '@/lib/agent/constants'
import { getI18n } from '@/lib/i18n/server'
import { faqsSchema, parseJsonField, servicesSchema } from '@/lib/knowledge/schemas'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

// =============================================================================
// Helpers
// =============================================================================

// Empty form fields arrive as "" — store them as NULL
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Resolve the caller's org from their session — never trust org ids from the form. */
async function requireOrg() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  return { orgId: auth.profile.organization_id, userId: auth.user.id }
}

// =============================================================================
// STEP 1 — Business details
// =============================================================================

const businessSchema = (e: Dictionary['errors']) => z.object({
  name: z.string().trim().min(2, e.businessNameMin).max(100),
  industry: z.enum(INDUSTRIES, { errorMap: () => ({ message: e.chooseIndustry }) }),
  timezone: z.enum(TIMEZONES, { errorMap: () => ({ message: e.chooseTimezone }) }),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === '' || z.string().email().safeParse(v).success, e.emailInvalid)
    .transform((v) => (v === '' ? null : v)),
  website: optionalText(200),
  address: optionalText(300),
  description: optionalText(1000),
})

export async function saveBusinessAction(formData: FormData): Promise<ActionResult> {
  const { t } = await getI18n()
  const parsed = businessSchema(t.errors).safeParse({
    name: formData.get('name') ?? '',
    industry: formData.get('industry') ?? '',
    timezone: formData.get('timezone') ?? '',
    phone: formData.get('phone') ?? '',
    email: formData.get('email') ?? '',
    website: formData.get('website') ?? '',
    address: formData.get('address') ?? '',
    description: formData.get('description') ?? '',
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { orgId } = await requireOrg()
  const supabase = await createClient()
  const { name, industry, timezone, ...info } = parsed.data

  // Read the current name first: the greeting may still be the default built from it
  const { data: previous } = await supabase.from('organizations').select('name').eq('id', orgId).single()
  const previousName = previous?.name ?? name

  const { error: orgError } = await supabase
    .from('organizations')
    .update({ name, industry, timezone })
    .eq('id', orgId)

  const { error: infoError } = await supabase
    .from('business_info')
    .update(info)
    .eq('organization_id', orgId)

  if (orgError || infoError) {
    console.error('[onboarding.business]', orgError?.message ?? infoError?.message)
    return { success: false, error: t.errors.saveBusinessFailed }
  }

  // Keep the draft agent's greeting in sync with the (possibly renamed) business —
  // only while it's still an auto-generated default, in the agent's own language
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('greeting, language, status')
    .eq('organization_id', orgId)
    .single()
  if (agent?.status === 'draft' && (!agent.greeting || isDefaultGreeting(agent.greeting, previousName))) {
    await supabase
      .from('ai_agents')
      .update({ greeting: defaultGreeting(agent.language, name) })
      .eq('organization_id', orgId)
  }

  redirect('/onboarding/hours')
}

// =============================================================================
// STEP 2 — Business hours + after-hours behavior
// =============================================================================

export async function saveHoursAction(formData: FormData): Promise<ActionResult> {
  const { t } = await getI18n()
  const rows: { day_of_week: number; is_closed: boolean; open_time: string | null; close_time: string | null }[] = []

  for (let day = 0; day <= 6; day++) {
    const isClosed = formData.get(`day-${day}-closed`) === 'on'
    const open = String(formData.get(`day-${day}-open`) ?? '')
    const close = String(formData.get(`day-${day}-close`) ?? '')

    if (!isClosed) {
      if (!TIME_RE.test(open) || !TIME_RE.test(close)) {
        return { success: false, error: t.errors.hoursMissing }
      }
      if (open >= close) {
        return { success: false, error: t.errors.hoursOrder }
      }
    }

    rows.push({
      day_of_week: day,
      is_closed: isClosed,
      open_time: isClosed ? null : open,
      close_time: isClosed ? null : close,
    })
  }

  if (rows.every((r) => r.is_closed)) {
    return { success: false, error: t.errors.hoursAllClosed }
  }

  const afterHours = String(formData.get('after_hours_behavior') ?? 'ai')
  if (!['ai', 'voicemail', 'transfer'].includes(afterHours)) {
    return { success: false, error: t.errors.chooseAfterHours }
  }
  const transferNumber = String(formData.get('transfer_number') ?? '').trim()
  if (afterHours === 'transfer' && transferNumber.length < 5) {
    return { success: false, error: t.errors.transferMissing }
  }

  const { orgId } = await requireOrg()
  const supabase = await createClient()

  const { error: hoursError } = await supabase
    .from('business_hours')
    .upsert(
      rows.map((r) => ({ ...r, organization_id: orgId })),
      { onConflict: 'organization_id,day_of_week' }
    )

  const { error: infoError } = await supabase
    .from('business_info')
    .update({
      after_hours_behavior: afterHours as 'ai' | 'voicemail' | 'transfer',
      transfer_number: afterHours === 'transfer' ? transferNumber : null,
    })
    .eq('organization_id', orgId)

  if (hoursError || infoError) {
    console.error('[onboarding.hours]', hoursError?.message ?? infoError?.message)
    return { success: false, error: t.errors.saveHoursFailed }
  }

  redirect('/onboarding/services')
}

// =============================================================================
// STEP 3 — Services + FAQs, then finish onboarding
// =============================================================================

export async function completeOnboardingAction(formData: FormData): Promise<ActionResult> {
  const { t } = await getI18n()
  const services = servicesSchema.safeParse(parseJsonField(formData, 'services'))
  if (!services.success) {
    return { success: false, error: t.errors.servicesInvalid }
  }
  const faqs = faqsSchema.safeParse(parseJsonField(formData, 'faqs'))
  if (!faqs.success) {
    return { success: false, error: t.errors.faqsInvalid }
  }

  const { orgId, userId } = await requireOrg()
  const supabase = await createClient()

  const { error: infoError } = await supabase
    .from('business_info')
    .update({ services: services.data })
    .eq('organization_id', orgId)

  // Onboarding can be revisited with "Back" — replace FAQs rather than append
  const { error: deleteError } = await supabase.from('faqs').delete().eq('organization_id', orgId)
  const { error: faqError } = faqs.data.length
    ? await supabase
        .from('faqs')
        .insert(faqs.data.map((f) => ({ ...f, organization_id: orgId })))
    : { error: null }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', userId)

  const failed = infoError ?? deleteError ?? faqError ?? profileError
  if (failed) {
    console.error('[onboarding.complete]', failed.message)
    return { success: false, error: t.errors.finishFailed }
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}
