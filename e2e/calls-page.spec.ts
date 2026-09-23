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
// Dashboard → Calls list + detail
// =============================================================================
test('calls list filters, searches and opens a call', async ({ page, browser }) => {
  test.setTimeout(120_000)
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Calls Page ${user.fullName.slice(-4)}`)
  const { organization_id } = await getProfile(user.email)

  // Seed three calls directly (the webhook path has its own test)
  const now = Date.now()
  const { data: seeded } = await admin
    .from('calls')
    .insert([
      {
        organization_id,
        provider_call_id: `e2e-list-a-${now}`,
        caller_number: '+992900000001',
        started_at: new Date(now - 3_600_000).toISOString(),
        duration_seconds: 125,
        status: 'completed',
        purpose: 'booking',
        summary: 'Zarina booked a haircut for Friday at 10. Follow-up needed.',
        recording_url: 'https://storage.vapi.ai/e2e-a.wav',
        transcript: [
          { role: 'assistant', text: 'Hello, how can I help?' },
          { role: 'caller', text: 'I would like a haircut on Friday.' },
        ],
      },
      {
        organization_id,
        provider_call_id: `e2e-list-b-${now}`,
        caller_number: '+992900000002',
        started_at: new Date(now - 7_200_000).toISOString(),
        duration_seconds: 4,
        status: 'missed',
        purpose: null,
        summary: null,
      },
      {
        organization_id,
        provider_call_id: `e2e-list-c-${now}`,
        caller_number: '+992900000003',
        started_at: new Date(now - 10_800_000).toISOString(),
        duration_seconds: 60,
        status: 'completed',
        purpose: 'faq',
        summary: 'Caller asked about parking; told it is free behind the building.',
      },
    ])
    .select('id, caller_number')
  const bookingCallId = seeded!.find((c) => c.caller_number === '+992900000001')!.id

  // List shows all three, newest first
  await page.locator('aside').getByRole('link', { name: 'Calls' }).click()
  await expect(page).toHaveURL(/\/dashboard\/calls$/)
  const rows = page.locator('main ul > li')
  await expect(rows).toHaveCount(3)
  await expect(rows.first()).toContainText('+992900000001')
  await expect(rows.first().getByLabel('Follow-up needed')).toBeVisible()

  // Filter by status
  await page.getByLabel('Status').selectOption('missed')
  await page.getByRole('button', { name: 'Filter' }).click()
  await expect(page).toHaveURL(/status=missed/)
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('+992900000002')

  // Search summary text
  await page.goto('/dashboard/calls?q=parking')
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('+992900000003')

  // Nothing matches → friendly empty state
  await page.goto('/dashboard/calls?q=zzznomatch')
  await expect(page.getByText('No calls match these filters')).toBeVisible()

  // Open the booking call
  await page.goto('/dashboard/calls')
  await rows.first().click()
  await expect(page).toHaveURL(new RegExp(`/dashboard/calls/${bookingCallId}$`))
  await expect(page.getByRole('heading', { name: '+992900000001' })).toBeVisible()
  await expect(page.getByText('Zarina booked a haircut for Friday at 10.')).toBeVisible()
  await expect(page.getByText('Follow-up needed', { exact: true })).toBeVisible()
  await expect(page.getByText('2:05')).toBeVisible() // 125 s
  await expect(page.locator('audio')).toHaveAttribute('src', 'https://storage.vapi.ai/e2e-a.wav')
  await expect(page.getByText('I would like a haircut on Friday.')).toBeVisible()

  // Overview's recent calls link to the same page
  await page.goto('/dashboard')
  await page.getByRole('link', { name: /\+992900000001/ }).click()
  await expect(page).toHaveURL(new RegExp(`/dashboard/calls/${bookingCallId}$`))

  // Another business cannot open this call
  const other = newTestUser()
  const ctx = await browser.newContext()
  const otherPage = await ctx.newPage()
  await registerToOnboarding(otherPage, other)
  await completeOnboardingQuickly(otherPage, `Other Biz ${other.fullName.slice(-4)}`)
  const res = await otherPage.goto(`/dashboard/calls/${bookingCallId}`)
  expect(res?.status()).toBe(404)
  await ctx.close()
})
