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
// Google Calendar integration (Google's own consent screen can't be automated;
// everything around it is tested here)
// =============================================================================
test('connect sends the owner to Google with the right OAuth request', async ({ page, context }) => {
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Google Test ${user.fullName.slice(-4)}`)

  await page.locator('aside').getByRole('link', { name: 'Integrations' }).click()
  await expect(page.getByRole('heading', { name: 'Google Calendar' })).toBeVisible()

  // Don't actually load Google — capture where we were sent
  await page.route('https://accounts.google.com/**', (route) => route.fulfill({ status: 200, body: 'google' }))
  await page.getByRole('link', { name: 'Connect Google Calendar' }).click()
  await page.waitForURL(/accounts\.google\.com/)
  const url = new URL(page.url())
  expect(url.searchParams.get('client_id')).toBe(process.env.GOOGLE_CLIENT_ID)
  expect(url.searchParams.get('redirect_uri')).toBe('https://evano-ai-kappa.vercel.app/api/integrations/google-calendar/callback')
  expect(url.searchParams.get('access_type')).toBe('offline')
  expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/calendar.events')
  expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/calendar.freebusy')

  // The state we were given matches the httpOnly cookie the callback will check
  const state = url.searchParams.get('state')
  const cookie = (await context.cookies('https://evano-ai-kappa.vercel.app/api/integrations/google-calendar')).find(
    (c) => c.name === 'evano_google_oauth_state'
  )
  expect(cookie?.value).toBe(state)
  expect(cookie?.httpOnly).toBe(true)
})

test('callback rejects forged state and handles a declined consent', async ({ page }) => {
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Google CSRF ${user.fullName.slice(-4)}`)

  await page.goto('/api/integrations/google-calendar/callback?code=fake&state=forged')
  await expect(page).toHaveURL(/\/dashboard\/integrations/)
  await expect(page.getByText('That connection attempt expired')).toBeVisible()

  await page.goto('/api/integrations/google-calendar/callback?error=access_denied')
  await expect(page.getByText('access was declined')).toBeVisible()

  const { organization_id } = await getProfile(user.email)
  const { data } = await admin.from('integrations').select('id').eq('organization_id', organization_id)
  expect(data).toEqual([])
})

test('a broken Google connection never blocks bookings and asks to reconnect', async ({ page, request }) => {
  test.setTimeout(120_000)
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Google Broken ${user.fullName.slice(-4)}`)
  const { organization_id } = await getProfile(user.email)

  // A "connected" integration whose stored token is garbage (as if revoked / corrupted)
  const { error } = await admin.from('integrations').insert({
    organization_id,
    provider: 'google_calendar',
    provider_account_id: 'owner@example.com',
    encrypted_credentials: '\\x00112233',
    metadata: {},
    status: 'connected',
  })
  expect(error).toBeNull()

  await page.goto('/dashboard/integrations')
  await expect(page.getByText('Connected as owner@example.com')).toBeVisible()

  // The AI can still check availability and book
  const assistantId = `e2e-assistant-google-${Date.now()}`
  await admin.from('ai_agents').update({ provider_agent_id: assistantId }).eq('organization_id', organization_id)
  const res = await request.post('/api/vapi/webhook', {
    headers: { 'x-evano-secret': process.env.VOICE_PROVIDER_WEBHOOK_SECRET! },
    data: {
      message: {
        type: 'tool-calls',
        call: { id: `e2e-google-${Date.now()}`, assistantId },
        toolCallList: [
          { id: 't1', type: 'function', function: { name: 'book_appointment', arguments: JSON.stringify({ customer_name: 'Rustam', date: 'next monday', time: '9:00' }) } },
        ],
      },
    },
  })
  expect((await res.json()).results[0].result).toContain('Booked:')

  // …and the dashboard now asks the owner to reconnect
  await page.reload()
  await expect(page.getByText('Access expired — reconnect')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Reconnect' })).toBeVisible()
})

test('owner can disconnect Google Calendar', async ({ page }) => {
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Google Off ${user.fullName.slice(-4)}`)
  const { organization_id } = await getProfile(user.email)
  await admin.from('integrations').insert({
    organization_id,
    provider: 'google_calendar',
    provider_account_id: 'owner@example.com',
    encrypted_credentials: '\\x00',
    metadata: {},
    status: 'connected',
  })

  await page.goto('/dashboard/integrations')
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Disconnect' }).click()
  await expect(page.getByText('Google Calendar disconnected')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Connect Google Calendar' })).toBeVisible()

  const { data } = await admin.from('integrations').select('id').eq('organization_id', organization_id)
  expect(data).toEqual([])
})
