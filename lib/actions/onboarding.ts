'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { TIMEZONES, INDUSTRIES } from '@/lib/onboarding/constants'
import type { ActionResult } from '@/lib/actions/auth'

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

const businessSchema = z.object({
  name: z.string().trim().min(2, 'Business name must be at least 2 characters').max(100),
  industry: z.enum(INDUSTRIES, { errorMap: () => ({ message: 'Choose an industry' }) }),
  timezone: z.enum(TIMEZONES, { errorMap: () => ({ message: 'Choose a timezone' }) }),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Invalid email address')
    .transform((v) => (v === '' ? null : v)),
  website: optionalText(200),
  address: optionalText(300),
  description: optionalText(1000),
})

export async function saveBusinessAction(formData: FormData): Promise<ActionResult> {
  const parsed = businessSchema.safeParse({
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
    return { success: false, error: 'Could not save your business details. Please try again.' }
  }

  // Keep the draft agent's greeting in sync with the (possibly renamed) business
  await supabase
    .from('ai_agents')
    .update({ greeting: `Thank you for calling ${name}. How can I help you today?` })
    .eq('organization_id', orgId)
    .eq('status', 'draft')

  redirect('/onboarding/hours')
}

// =============================================================================
// STEP 2 — Business hours + after-hours behavior
// =============================================================================

export async function saveHoursAction(formData: FormData): Promise<ActionResult> {
  const rows: { day_of_week: number; is_closed: boolean; open_time: string | null; close_time: string | null }[] = []

  for (let day = 0; day <= 6; day++) {
    const isClosed = formData.get(`day-${day}-closed`) === 'on'
    const open = String(formData.get(`day-${day}-open`) ?? '')
    const close = String(formData.get(`day-${day}-close`) ?? '')

    if (!isClosed) {
      if (!TIME_RE.test(open) || !TIME_RE.test(close)) {
        return { success: false, error: 'Enter opening and closing times for every open day.' }
      }
      if (open >= close) {
        return { success: false, error: 'Closing time must be after opening time.' }
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
    return { success: false, error: 'Your business needs to be open at least one day.' }
  }

  const afterHours = String(formData.get('after_hours_behavior') ?? 'ai')
  if (!['ai', 'voicemail', 'transfer'].includes(afterHours)) {
    return { success: false, error: 'Choose what happens after hours.' }
  }
  const transferNumber = String(formData.get('transfer_number') ?? '').trim()
  if (afterHours === 'transfer' && transferNumber.length < 5) {
    return { success: false, error: 'Enter the number calls should be forwarded to.' }
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
    return { success: false, error: 'Could not save your hours. Please try again.' }
  }

  redirect('/onboarding/services')
}

// =============================================================================
// STEP 3 — Services + FAQs, then finish onboarding
// =============================================================================

const servicesSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(100),
      duration: z.number().int().min(5).max(600).nullable(),
      price: z.string().trim().max(40),
    })
  )
  .max(50)

const faqsSchema = z
  .array(
    z.object({
      question: z.string().trim().min(3).max(300),
      answer: z.string().trim().min(1).max(2000),
    })
  )
  .max(50)

function parseJsonField(formData: FormData, key: string): unknown {
  try {
    return JSON.parse(String(formData.get(key) ?? '[]'))
  } catch {
    return null
  }
}

export async function completeOnboardingAction(formData: FormData): Promise<ActionResult> {
  const services = servicesSchema.safeParse(parseJsonField(formData, 'services'))
  if (!services.success) {
    return { success: false, error: 'Every service needs a name (duration 5–600 minutes).' }
  }
  const faqs = faqsSchema.safeParse(parseJsonField(formData, 'faqs'))
  if (!faqs.success) {
    return { success: false, error: 'Every FAQ needs a question (3+ characters) and an answer.' }
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
    return { success: false, error: 'Could not finish setup. Please try again.' }
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}
