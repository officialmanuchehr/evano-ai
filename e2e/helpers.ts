import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// =============================================================================
// Shared E2E helpers
// =============================================================================

// Admin client — used to verify saved data and clean up test accounts
export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type TestUser = { fullName: string; email: string; password: string }

const createdEmails: string[] = []

/** Random throwaway password (meets the app's rules) — never hard-code one in tests. */
export function randomPassword() {
  return `E2e-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}-9`
}

export function newTestUser(): TestUser {
  const id = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`
  const user = {
    fullName: `E2E Tester ${id.slice(-4)}`,
    email: `e2e.${id}@evano-test.dev`,
    password: randomPassword(),
  }
  createdEmails.push(user.email)
  return user
}

export async function register(page: Page, user: TestUser) {
  await page.goto('/auth/register')
  await page.getByLabel('Full name').fill(user.fullName)
  await page.getByLabel('Email address').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Create account' }).click()
}

/** Register and wait until signup lands on onboarding step 1. */
export async function registerToOnboarding(page: Page, user: TestUser) {
  await register(page, user)
  // Signup makes several sequential DB writes — allow for production cold starts
  await expect(page).toHaveURL(/\/onboarding\/business/, { timeout: 20_000 })
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** Click through all onboarding steps with minimal input. */
export async function completeOnboardingQuickly(page: Page, businessName: string) {
  await page.getByLabel('Business name').fill(businessName)
  await page.getByLabel('Industry').selectOption('Other')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/onboarding\/hours/, { timeout: 15_000 })
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/onboarding\/services/, { timeout: 15_000 })
  await page.getByRole('button', { name: 'Finish setup' }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })
}

export async function getProfile(email: string) {
  const { data } = await admin
    .from('profiles')
    .select('id, organization_id, onboarding_completed')
    .eq('email', email)
    .single()
  return data!
}

/** Call the Vapi REST API with the private key (test cleanup / verification only). */
export async function vapiRequest(path: string, init: RequestInit = {}) {
  return fetch(`https://api.vapi.ai${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.VOICE_PROVIDER_API_KEY}`, 'Content-Type': 'application/json' },
  })
}

/**
 * Delete every account created via newTestUser() — including any Vapi assistant
 * or phone number it created — then the org (cascades to all its data).
 */
export async function cleanupTestUsers() {
  while (createdEmails.length) {
    const email = createdEmails.pop()!
    const { data: profile } = await admin
      .from('profiles')
      .select('id, organization_id')
      .eq('email', email)
      .maybeSingle()

    if (profile) {
      const orgId = profile.organization_id
      const [{ data: agent }, { data: phone }] = await Promise.all([
        admin.from('ai_agents').select('provider_agent_id').eq('organization_id', orgId).maybeSingle(),
        admin.from('phone_numbers').select('provider_number_id').eq('organization_id', orgId).maybeSingle(),
      ])
      if (phone?.provider_number_id) await vapiRequest(`/phone-number/${phone.provider_number_id}`, { method: 'DELETE' })
      if (agent?.provider_agent_id) await vapiRequest(`/assistant/${agent.provider_agent_id}`, { method: 'DELETE' })

      await admin.auth.admin.deleteUser(profile.id)
      await admin.from('organizations').delete().eq('id', orgId)
    }
  }
}
