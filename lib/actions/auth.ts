'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getI18n } from '@/lib/i18n/server'
import { interpolate } from '@/lib/i18n/config'
import { defaultGreeting } from '@/lib/agent/constants'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

// =============================================================================
// Validation schemas (messages in the visitor's language)
// =============================================================================

const passwordSchema = (e: Dictionary['errors']) =>
  z
    .string()
    .min(8, e.passwordMin)
    .regex(/[A-Z]/, e.passwordUpper)
    .regex(/[0-9]/, e.passwordNumber)

const registerSchema = (e: Dictionary['errors']) =>
  z.object({
    fullName: z.string().trim().min(2, e.nameMin),
    email: z.string().email(e.emailInvalid),
    password: passwordSchema(e),
  })

const loginSchema = (e: Dictionary['errors']) =>
  z.object({
    email: z.string().email(e.emailInvalid),
    password: z.string().min(1, e.passwordRequired),
  })

// =============================================================================
// Helper: Generate org slug
// =============================================================================
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `${base || 'business'}-${Math.random().toString(36).slice(2, 7)}`
}

// =============================================================================
// Action result type
// =============================================================================
export type ActionResult = {
  success: boolean
  error?: string
}

// =============================================================================
// REGISTER
// =============================================================================
export async function registerAction(formData: FormData): Promise<ActionResult> {
  const { locale, t } = await getI18n()
  const parsed = registerSchema(t.errors).safeParse({
    fullName: formData.get('fullName') ?? '',
    email: formData.get('email') ?? '',
    password: formData.get('password') ?? '',
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { fullName, email, password } = parsed.data
  const supabase = await createClient()

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { success: false, error: t.errors.accountExists }
    }
    console.error('[auth.register] signUp error:', authError.message)
    return { success: false, error: t.errors.createFailed }
  }

  if (!authData.user) {
    return { success: false, error: t.errors.createFailed }
  }

  // 2. Create organization + profile using admin client (bypasses RLS for initial setup)
  const adminClient = createAdminClient()
  const orgName = interpolate(t.onboarding.defaultOrgName, { name: fullName })

  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .insert({ name: orgName, slug: generateSlug(fullName) })
    .select()
    .single()

  if (orgError || !org) {
    console.error('[auth.register] org creation error:', orgError?.message)
    // Clean up auth user on failure
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: t.errors.setupFailed }
  }

  // 3. Create profile
  const { error: profileError } = await adminClient.from('profiles').insert({
    id: authData.user.id,
    organization_id: org.id,
    full_name: fullName,
    email,
    role: 'owner',
  })

  if (profileError) {
    console.error('[auth.register] profile creation error:', profileError.message)
    await adminClient.auth.admin.deleteUser(authData.user.id)
    await adminClient.from('organizations').delete().eq('id', org.id)
    return { success: false, error: t.errors.setupFailed }
  }

  // 4. Create default AI agent — speaks the language the owner signed up in
  const agentLanguage = locale === 'ru' ? 'ru-RU' : 'en-US'
  await adminClient.from('ai_agents').insert({
    organization_id: org.id,
    name: t.onboarding.defaultAgentName,
    language: agentLanguage,
    tone: 'professional',
    response_length: 'balanced',
    status: 'draft',
    greeting: defaultGreeting(agentLanguage, orgName),
  })

  // 5. Create default business_info
  await adminClient.from('business_info').insert({ organization_id: org.id })

  // 6. Create subscription (free plan)
  await adminClient.from('subscriptions').insert({ organization_id: org.id, plan: 'free', status: 'active' })

  // 7. Seed default business hours (Mon–Fri 9–17, Sat–Sun closed)
  const defaultHours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    organization_id: org.id,
    day_of_week: day,
    open_time: day === 0 || day === 6 ? null : '09:00',
    close_time: day === 0 || day === 6 ? null : '17:00',
    is_closed: day === 0 || day === 6,
  }))
  await adminClient.from('business_hours').insert(defaultHours)

  revalidatePath('/dashboard')
  redirect('/onboarding/business')
}

// =============================================================================
// LOGIN
// =============================================================================
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const { t } = await getI18n()
  const parsed = loginSchema(t.errors).safeParse({
    email: formData.get('email') ?? '',
    password: formData.get('password') ?? '',
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    if (error.message.includes('Invalid login credentials')) return { success: false, error: t.errors.wrongCredentials }
    if (error.message.includes('Email not confirmed')) return { success: false, error: t.errors.confirmEmail }
    console.error('[auth.login] error:', error.message)
    return { success: false, error: t.errors.signInFailed }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

// =============================================================================
// LOGOUT
// =============================================================================
export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

// =============================================================================
// RESET PASSWORD
// =============================================================================
export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  const { t } = await getI18n()
  const parsed = z.object({ email: z.string().email(t.errors.emailInvalid) }).safeParse({ email: formData.get('email') ?? '' })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    // Lands on /auth/confirm, which signs the user in for the reset, then forwards
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/auth/reset-password`,
  })

  if (error) {
    console.error('[auth.resetPassword] error:', error.message)
    return { success: false, error: t.errors.resetSendFailed }
  }

  return { success: true }
}

// =============================================================================
// SET NEW PASSWORD (after following the reset link — user has a recovery session)
// =============================================================================
export async function updatePasswordAction(formData: FormData): Promise<ActionResult> {
  const { t } = await getI18n()
  const parsed = z
    .object({ password: passwordSchema(t.errors), confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: t.errors.passwordsMismatch, path: ['confirm'] })
    .safeParse({ password: formData.get('password') ?? '', confirm: formData.get('confirm') ?? '' })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: t.errors.resetExpired }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    console.error('[auth.updatePassword] error:', error.message)
    const sameAsOld = error.message.toLowerCase().includes('different from the old')
    return { success: false, error: sameAsOld ? t.errors.samePassword : t.errors.updatePasswordFailed }
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}
