'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

// =============================================================================
// Validation Schemas
// =============================================================================

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// =============================================================================
// Helper: Generate org slug
// =============================================================================
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    + '-'
    + Math.random().toString(36).slice(2, 7)
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
  const raw = {
    fullName: formData.get('fullName') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { fullName, email, password } = parsed.data
  const supabase = await createClient()

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { success: false, error: 'An account with this email already exists.' }
    }
    console.error('[auth.register] signUp error:', authError.message)
    return { success: false, error: 'Could not create account. Please try again.' }
  }

  if (!authData.user) {
    return { success: false, error: 'Could not create account. Please try again.' }
  }

  // 2. Create organization + profile using admin client (bypasses RLS for initial setup)
  const adminClient = createAdminClient()
  const orgName = fullName + "'s Business"
  const slug = generateSlug(orgName)

  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .insert({ name: orgName, slug })
    .select()
    .single()

  if (orgError || !org) {
    console.error('[auth.register] org creation error:', orgError?.message)
    // Clean up auth user on failure
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: 'Could not set up your account. Please try again.' }
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
    return { success: false, error: 'Could not set up your account. Please try again.' }
  }

  // 4. Create default AI agent
  await adminClient.from('ai_agents').insert({
    organization_id: org.id,
    name: 'AI Receptionist',
    tone: 'professional',
    response_length: 'balanced',
    status: 'draft',
    greeting: `Thank you for calling ${orgName}. How can I help you today?`,
  })

  // 5. Create default business_info
  await adminClient.from('business_info').insert({
    organization_id: org.id,
  })

  // 6. Create subscription (free plan)
  await adminClient.from('subscriptions').insert({
    organization_id: org.id,
    plan: 'free',
    status: 'active',
  })

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
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { email, password } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { success: false, error: 'Incorrect email or password.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { success: false, error: 'Please confirm your email address before logging in.' }
    }
    console.error('[auth.login] error:', error.message)
    return { success: false, error: 'Could not sign in. Please try again.' }
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
  const raw = { email: formData.get('email') as string }
  const parsed = resetPasswordSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })

  if (error) {
    console.error('[auth.resetPassword] error:', error.message)
    return { success: false, error: 'Could not send reset email. Please try again.' }
  }

  return { success: true }
}
