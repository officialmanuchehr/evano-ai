'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createAdminClient, createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { LANGUAGES, LIMITS, RESPONSE_LENGTHS, TONES, VOICE_OPTIONS } from '@/lib/agent/constants'
import { syncAssistant } from '@/lib/vapi/sync'
import { setPhoneNumberAssistant, VapiError } from '@/lib/vapi/client'
import type { ActionResult } from '@/lib/actions/auth'
import { getI18n } from '@/lib/i18n/server'
import { interpolate } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

// =============================================================================
// Helpers
// =============================================================================

const values = <T extends readonly { value: string }[]>(opts: T) =>
  opts.map((o) => o.value) as [T[number]['value'], ...T[number]['value'][]]

async function requireOrgId() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  return auth.profile.organization_id
}

function vapiErrorMessage(err: unknown, fallback: string) {
  console.error('[agent.vapi]', err)
  return err instanceof VapiError ? `${fallback} (${err.message})` : fallback
}

// =============================================================================
// Save receptionist settings (and push them to Vapi if an assistant exists)
// =============================================================================

const agentSchema = (e: Dictionary['errors']) => z.object({
  name: z.string().trim().min(2, e.nameMin).max(LIMITS.name),
  greeting: z
    .string()
    .trim()
    .min(10, e.greetingMin)
    .max(LIMITS.greeting, interpolate(e.greetingMax, { max: LIMITS.greeting })),
  tone: z.enum(values(TONES), { errorMap: () => ({ message: e.chooseTone }) }),
  response_length: z.enum(values(RESPONSE_LENGTHS), { errorMap: () => ({ message: e.chooseLength }) }),
  language: z.enum(values(LANGUAGES), { errorMap: () => ({ message: e.chooseLanguage }) }),
  voice_id: z.string().refine((v) => VOICE_OPTIONS.some((o) => o.id === v), e.chooseVoice),
  system_prompt: z
    .string()
    .trim()
    .max(LIMITS.instructions, interpolate(e.instructionsMax, { max: LIMITS.instructions }))
    .transform((v) => (v === '' ? null : v)),
})

export async function updateAgentAction(formData: FormData): Promise<ActionResult> {
  const { t } = await getI18n()
  const parsed = agentSchema(t.errors).safeParse({
    name: formData.get('name') ?? '',
    greeting: formData.get('greeting') ?? '',
    tone: formData.get('tone') ?? '',
    response_length: formData.get('response_length') ?? '',
    language: formData.get('language') ?? '',
    voice_id: formData.get('voice_id') ?? '',
    system_prompt: formData.get('system_prompt') ?? '',
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }
  if (!VOICE_OPTIONS.find((o) => o.id === parsed.data.voice_id)!.languages.includes(parsed.data.language)) {
    return { success: false, error: t.errors.voiceLanguage }
  }

  const orgId = await requireOrgId()

  // Org comes from the session; RLS also restricts the update to this org
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_agents')
    .update(parsed.data)
    .eq('organization_id', orgId)
    .select('provider_agent_id')

  if (error || !data?.length) {
    console.error('[agent.update]', error?.message ?? 'no agent row for org')
    return { success: false, error: t.errors.saveSettingsFailed }
  }

  // Assistant already exists in Vapi → push the new settings live
  if (data[0].provider_agent_id) {
    try {
      await syncAssistant(orgId)
    } catch (err) {
      return { success: false, error: vapiErrorMessage(err, t.errors.liveUpdateFailed) }
    }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

// =============================================================================
// Browser test call — make sure an up-to-date assistant exists, return its id
// =============================================================================

export async function prepareTestCallAction(): Promise<ActionResult & { assistantId?: string }> {
  const { t } = await getI18n()
  const orgId = await requireOrgId()
  try {
    const assistantId = await syncAssistant(orgId)
    return { success: true, assistantId }
  } catch (err) {
    return { success: false, error: vapiErrorMessage(err, t.errors.testCallFailed) }
  }
}

// =============================================================================
// Go live / pause — attaches or detaches the assistant on the phone number
// =============================================================================

export async function setLiveAction(live: boolean): Promise<ActionResult> {
  const { t } = await getI18n()
  const orgId = await requireOrgId()
  const db = createAdminClient()

  const { data: phone } = await db
    .from('phone_numbers')
    .select('id, provider_number_id')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!phone?.provider_number_id) {
    return { success: false, error: t.errors.needPhone }
  }

  try {
    const assistantId = live ? await syncAssistant(orgId) : null
    await setPhoneNumberAssistant(phone.provider_number_id, assistantId)
  } catch (err) {
    return { success: false, error: vapiErrorMessage(err, live ? t.errors.goLiveFailed : t.errors.pauseFailed) }
  }

  await db.from('ai_agents').update({ status: live ? 'active' : 'paused' }).eq('organization_id', orgId)
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
