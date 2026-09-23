'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { syncAssistant, webhookConfig } from '@/lib/vapi/sync'
import { deletePhoneNumber, importTwilioNumber, setPhoneNumberAssistant, VapiError } from '@/lib/vapi/client'
import type { ActionResult } from '@/lib/actions/auth'

// =============================================================================
// Connect a Twilio number to the organization's receptionist.
// The Twilio auth token is passed straight to Vapi and never stored by us.
// =============================================================================

const twilioSchema = z.object({
  number: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s()-]/g, ''))
    .refine((v) => /^\+[1-9]\d{6,14}$/.test(v), 'Enter the number in international format, e.g. +12025550123'),
  accountSid: z
    .string()
    .trim()
    .regex(/^AC[0-9a-fA-F]{32}$/, 'Account SID starts with "AC" followed by 32 characters'),
  authToken: z.string().trim().min(16, 'Enter your Twilio auth token'),
})

async function requireOrg() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  return { orgId: auth.profile.organization_id, orgName: auth.profile.organizations?.name ?? 'Business' }
}

export async function connectTwilioNumberAction(formData: FormData): Promise<ActionResult> {
  const parsed = twilioSchema.safeParse({
    number: formData.get('number') ?? '',
    accountSid: formData.get('accountSid') ?? '',
    authToken: formData.get('authToken') ?? '',
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { orgId, orgName } = await requireOrg()
  const db = createAdminClient()

  const { data: existing } = await db.from('phone_numbers').select('id').eq('organization_id', orgId).maybeSingle()
  if (existing) return { success: false, error: 'A phone number is already connected. Disconnect it first.' }

  const { webhookUrl, webhookSecret } = webhookConfig()

  // 1. Import the number first — if Twilio rejects it, nothing else was created
  let vapiNumberId: string
  try {
    const imported = await importTwilioNumber({
      number: parsed.data.number,
      twilioAccountSid: parsed.data.accountSid,
      twilioAuthToken: parsed.data.authToken,
      name: `${orgName}`.slice(0, 40),
      server: { url: webhookUrl, headers: { 'x-evano-secret': webhookSecret } },
    })
    vapiNumberId = imported.id
  } catch (err) {
    console.error('[phone.connect] import failed', err)
    const detail = err instanceof VapiError ? ` (${err.message})` : ''
    return { success: false, error: `Could not connect this number. Check the number and Twilio credentials.${detail}` }
  }

  // 2. Create/refresh the assistant and attach it — the receptionist is live
  try {
    const assistantId = await syncAssistant(orgId)
    await setPhoneNumberAssistant(vapiNumberId, assistantId)
  } catch (err) {
    console.error('[phone.connect] assistant attach failed', err)
    await deletePhoneNumber(vapiNumberId).catch(() => {}) // roll back the import
    return { success: false, error: 'The number was accepted but the receptionist could not be attached. Please try again.' }
  }

  const { data: agent } = await db.from('ai_agents').select('id').eq('organization_id', orgId).single()
  const { error } = await db.from('phone_numbers').insert({
    organization_id: orgId,
    agent_id: agent?.id ?? null,
    phone_number: parsed.data.number,
    provider: 'twilio',
    provider_number_id: vapiNumberId,
    status: 'active',
  })
  if (error) {
    console.error('[phone.connect] db insert failed', error.message)
    await deletePhoneNumber(vapiNumberId).catch(() => {})
    return { success: false, error: 'Could not save the phone number. Please try again.' }
  }

  await db.from('ai_agents').update({ status: 'active' }).eq('organization_id', orgId)
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

// =============================================================================
// Disconnect — removes the number from Vapi (Twilio keeps owning it)
// =============================================================================

export async function disconnectPhoneAction(): Promise<ActionResult> {
  const { orgId } = await requireOrg()
  const db = createAdminClient()

  const { data: phone } = await db
    .from('phone_numbers')
    .select('id, provider_number_id')
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!phone) return { success: true }

  if (phone.provider_number_id) {
    try {
      await deletePhoneNumber(phone.provider_number_id)
    } catch (err) {
      // Already gone in Vapi is fine; anything else is a real failure
      if (!(err instanceof VapiError && err.status === 404)) {
        console.error('[phone.disconnect]', err)
        return { success: false, error: 'Could not disconnect the number. Please try again.' }
      }
    }
  }

  await db.from('phone_numbers').delete().eq('id', phone.id)
  await db.from('ai_agents').update({ status: 'draft' }).eq('organization_id', orgId)
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
