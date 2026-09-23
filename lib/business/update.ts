import 'server-only'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { TIMEZONES, INDUSTRIES } from '@/lib/onboarding/constants'
import { defaultGreeting, isDefaultGreeting } from '@/lib/agent/constants'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import type { ActionResult } from '@/lib/actions/auth'

// =============================================================================
// Business details + opening hours — shared by onboarding and Settings.
// `orgId` must come from the signed-in session. Writes use the user's client,
// so RLS and column grants still apply.
// =============================================================================

type Errors = Dictionary['errors']

// Empty form fields arrive as "" — store them as NULL
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const businessSchema = (e: Errors) =>
  z.object({
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

/** Validate + save business details. Also keeps an untouched default greeting in sync with a renamed business. */
export async function applyBusinessDetails(orgId: string, formData: FormData, e: Errors): Promise<ActionResult> {
  const parsed = businessSchema(e).safeParse({
    name: formData.get('name') ?? '',
    industry: formData.get('industry') ?? '',
    timezone: formData.get('timezone') ?? '',
    phone: formData.get('phone') ?? '',
    email: formData.get('email') ?? '',
    website: formData.get('website') ?? '',
    address: formData.get('address') ?? '',
    description: formData.get('description') ?? '',
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { name, industry, timezone, ...info } = parsed.data

  // Read the current name first: the greeting may still be the default built from it
  const { data: previous } = await supabase.from('organizations').select('name').eq('id', orgId).single()
  const previousName = previous?.name ?? name

  const { error: orgError } = await supabase.from('organizations').update({ name, industry, timezone }).eq('id', orgId)
  const { error: infoError } = await supabase.from('business_info').update(info).eq('organization_id', orgId)
  if (orgError || infoError) {
    console.error('[business.details]', orgError?.message ?? infoError?.message)
    return { success: false, error: e.saveBusinessFailed }
  }

  // Only replace a greeting the owner never customised, in the agent's own language
  const { data: agent } = await supabase.from('ai_agents').select('greeting, language').eq('organization_id', orgId).single()
  if (agent && (!agent.greeting || isDefaultGreeting(agent.greeting, previousName))) {
    await supabase
      .from('ai_agents')
      .update({ greeting: defaultGreeting(agent.language, name) })
      .eq('organization_id', orgId)
  }

  return { success: true }
}

/** Validate + save the weekly schedule and after-hours behaviour. */
export async function applyHours(orgId: string, formData: FormData, e: Errors): Promise<ActionResult> {
  const rows: { day_of_week: number; is_closed: boolean; open_time: string | null; close_time: string | null }[] = []

  for (let day = 0; day <= 6; day++) {
    const isClosed = formData.get(`day-${day}-closed`) === 'on'
    const open = String(formData.get(`day-${day}-open`) ?? '')
    const close = String(formData.get(`day-${day}-close`) ?? '')

    if (!isClosed) {
      if (!TIME_RE.test(open) || !TIME_RE.test(close)) return { success: false, error: e.hoursMissing }
      if (open >= close) return { success: false, error: e.hoursOrder }
    }
    rows.push({ day_of_week: day, is_closed: isClosed, open_time: isClosed ? null : open, close_time: isClosed ? null : close })
  }

  if (rows.every((r) => r.is_closed)) return { success: false, error: e.hoursAllClosed }

  const afterHours = String(formData.get('after_hours_behavior') ?? 'ai')
  if (!['ai', 'voicemail', 'transfer'].includes(afterHours)) return { success: false, error: e.chooseAfterHours }
  const transferNumber = String(formData.get('transfer_number') ?? '').trim()
  if (afterHours === 'transfer' && transferNumber.length < 5) return { success: false, error: e.transferMissing }

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
    console.error('[business.hours]', hoursError?.message ?? infoError?.message)
    return { success: false, error: e.saveHoursFailed }
  }
  return { success: true }
}
