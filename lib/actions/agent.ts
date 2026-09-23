'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { LANGUAGES, LIMITS, RESPONSE_LENGTHS, TONES } from '@/lib/agent/constants'
import type { ActionResult } from '@/lib/actions/auth'

// =============================================================================
// Update the organization's AI receptionist settings
// =============================================================================

const values = <T extends readonly { value: string }[]>(opts: T) =>
  opts.map((o) => o.value) as [T[number]['value'], ...T[number]['value'][]]

const agentSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(LIMITS.name),
  greeting: z
    .string()
    .trim()
    .min(10, 'Greeting must be at least 10 characters')
    .max(LIMITS.greeting, `Greeting must be under ${LIMITS.greeting} characters`),
  tone: z.enum(values(TONES), { errorMap: () => ({ message: 'Choose a tone' }) }),
  response_length: z.enum(values(RESPONSE_LENGTHS), { errorMap: () => ({ message: 'Choose an answer length' }) }),
  language: z.enum(values(LANGUAGES), { errorMap: () => ({ message: 'Choose a language' }) }),
  system_prompt: z
    .string()
    .trim()
    .max(LIMITS.instructions, `Instructions must be under ${LIMITS.instructions} characters`)
    .transform((v) => (v === '' ? null : v)),
})

export async function updateAgentAction(formData: FormData): Promise<ActionResult> {
  const parsed = agentSchema.safeParse({
    name: formData.get('name') ?? '',
    greeting: formData.get('greeting') ?? '',
    tone: formData.get('tone') ?? '',
    response_length: formData.get('response_length') ?? '',
    language: formData.get('language') ?? '',
    system_prompt: formData.get('system_prompt') ?? '',
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')

  // Org comes from the session; RLS also restricts the update to this org
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_agents')
    .update(parsed.data)
    .eq('organization_id', auth.profile.organization_id)
    .select('id')

  if (error || !data?.length) {
    console.error('[agent.update]', error?.message ?? 'no agent row for org')
    return { success: false, error: 'Could not save your settings. Please try again.' }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
