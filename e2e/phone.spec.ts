import { test, expect } from '@playwright/test'
import {
  admin,
  newTestUser,
  registerToOnboarding,
  completeOnboardingQuickly,
  getProfile,
  cleanupTestUsers,
} from './helpers'

test.afterAll(cleanupTestUsers)

// =============================================================================
// Dashboard → Phone
// =============================================================================
test('phone page validates Twilio details and rejects numbers Twilio does not own', async ({ page }) => {
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Phone Test ${user.fullName.slice(-4)}`)

  await page.locator('aside').getByRole('link', { name: 'Phone' }).click()
  await expect(page).toHaveURL(/\/dashboard\/phone$/)
  await expect(page.getByRole('heading', { name: 'Connect your Twilio number' })).toBeVisible()

  // 1. Format validation happens before anything is sent to Vapi
  await page.getByLabel('Twilio phone number').fill('+12025550123')
  await page.getByLabel('Account SID').fill('not-a-sid')
  await page.getByLabel('Auth token').fill('0123456789abcdef0123456789abcdef')
  await page.getByRole('button', { name: 'Connect number' }).click()
  await expect(page.getByText('Account SID starts with "AC"')).toBeVisible()

  // 2. Well-formed but fake credentials → Vapi/Twilio reject them, we show the error
  await page.getByLabel('Account SID').fill(`AC${'0'.repeat(32)}`)
  await page.getByRole('button', { name: 'Connect number' }).click()
  await expect(page.getByText(/Could not connect this number/)).toBeVisible({ timeout: 30_000 })

  // 3. Nothing was created: no phone row, no Vapi assistant, still in draft
  const { organization_id } = await getProfile(user.email)
  const { data: phone } = await admin.from('phone_numbers').select('id').eq('organization_id', organization_id)
  expect(phone).toEqual([])
  const { data: agent } = await admin
    .from('ai_agents')
    .select('provider_agent_id, status')
    .eq('organization_id', organization_id)
    .single()
  expect(agent).toEqual({ provider_agent_id: null, status: 'draft' })
})

test('AI Receptionist page asks to connect a phone before going live', async ({ page }) => {
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Live Test ${user.fullName.slice(-4)}`)

  await page.goto('/dashboard/agent')
  await expect(page.getByRole('link', { name: 'Connect a phone number' })).toBeVisible()
  await page.getByRole('link', { name: 'Connect a phone number' }).click()
  await expect(page).toHaveURL(/\/dashboard\/phone$/)
})

// =============================================================================
// Vapi webhook
// =============================================================================
test('webhook rejects requests without the shared secret', async ({ request }) => {
  const res = await request.post('/api/vapi/webhook', { data: { message: { type: 'status-update' } } })
  expect(res.status()).toBe(401)
})

test('webhook answers assistant-request (paused number) with a spoken message', async ({ request }) => {
  const res = await request.post('/api/vapi/webhook', {
    headers: { 'x-evano-secret': process.env.VOICE_PROVIDER_WEBHOOK_SECRET! },
    data: { message: { type: 'assistant-request', phoneNumber: { id: 'unknown-number' } } },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.error).toContain("can't take your call right now")
})
