import { test, expect } from '@playwright/test'
import {
  admin,
  newTestUser,
  registerToOnboarding,
  completeOnboardingQuickly,
  getProfile,
  login,
  cleanupTestUsers,
  vapiRequest,
} from './helpers'

test.afterAll(cleanupTestUsers)

// =============================================================================
// Dashboard → Settings
// =============================================================================
test('owner updates business details and hours; the live receptionist follows', async ({ page }) => {
  test.setTimeout(150_000)
  const user = newTestUser()
  const oldName = `Settings Test ${user.fullName.slice(-4)}`
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, oldName)
  const { organization_id } = await getProfile(user.email)

  // Real Vapi assistant so saving must refresh it
  const created = await vapiRequest('/assistant', {
    method: 'POST',
    body: JSON.stringify({ name: 'evano-e2e-settings', metadata: { organizationId: organization_id } }),
  })
  const assistantId = ((await created.json()) as { id: string }).id
  await admin.from('ai_agents').update({ provider_agent_id: assistantId }).eq('organization_id', organization_id)

  await page.locator('aside').getByRole('link', { name: 'Settings' }).click()
  await expect(page).toHaveURL(/\/dashboard\/settings$/)
  const business = page.getByRole('region', { name: 'Business details' })
  const hours = page.getByRole('region', { name: 'Opening hours' })

  // Business details: rename + address
  const newName = `Renamed Studio ${user.fullName.slice(-4)}`
  await expect(business.getByLabel('Business name')).toHaveValue(oldName)
  await business.getByLabel('Business name').fill(newName)
  await business.getByLabel('Address').fill('Somoni 5, Dushanbe')
  await business.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('aside').getByText(newName)).toBeVisible()

  // The untouched default greeting follows the new name
  const { data: agent } = await admin.from('ai_agents').select('greeting').eq('organization_id', organization_id).single()
  expect(agent?.greeting).toBe(`Thank you for calling ${newName}. How can I help you today?`)

  // Hours: open Saturday 10–14
  await hours.getByLabel('Saturday closed').uncheck()
  await hours.getByLabel('Saturday opens').fill('10:00')
  await hours.getByLabel('Saturday closes').fill('14:00')
  await hours.getByRole('button', { name: 'Save changes' }).click()

  // Wait for the save itself (the earlier "Saved" toast may still be on screen)
  await expect
    .poll(
      async () =>
        (
          await admin
            .from('business_hours')
            .select('is_closed, open_time, close_time')
            .eq('organization_id', organization_id)
            .eq('day_of_week', 6)
            .single()
        ).data,
      { timeout: 20_000 }
    )
    .toEqual({ is_closed: false, open_time: '10:00:00', close_time: '14:00:00' })
  await expect(hours.getByRole('button', { name: 'Save changes' })).toBeEnabled()

  // Live receptionist got both changes
  const live = await (await vapiRequest(`/assistant/${assistantId}`)).json()
  const prompt: string = live.model.messages[0].content
  expect(prompt).toContain(`receptionist for ${newName}`)
  expect(prompt).toContain('Address: Somoni 5, Dushanbe')
  expect(prompt).toContain('- Saturday: 10:00–14:00')
  expect(live.firstMessage).toBe(`Thank you for calling ${newName}. How can I help you today?`)
})

test('owner changes their name and password', async ({ page }) => {
  test.setTimeout(120_000)
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Account Test ${user.fullName.slice(-4)}`)

  await page.goto('/dashboard/settings')
  const account = page.getByRole('region', { name: 'Account' })
  await expect(account.getByLabel('Sign-in email')).toHaveValue(user.email)

  // Name
  await account.getByLabel('Your name').fill('Renamed Owner')
  await account.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 })
  const { data: profile } = await admin.from('profiles').select('full_name').eq('email', user.email).single()
  expect(profile?.full_name).toBe('Renamed Owner')

  // Password: mismatch rejected, then changed
  const newPassword = 'Settings-New-2026'
  await account.getByLabel('New password', { exact: true }).fill(newPassword)
  await account.getByLabel('Confirm new password').fill('Different-2026')
  await account.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Passwords do not match')).toBeVisible()
  await account.getByLabel('Confirm new password').fill(newPassword)
  await account.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Password changed')).toBeVisible({ timeout: 15_000 })

  // Sign in again with the new password
  await page.locator('aside').getByRole('button', { name: 'Sign out' }).click()
  await login(page, user.email, newPassword)
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })

  // Interface language switch lives here too
  await page.goto('/dashboard/settings')
  await page.getByRole('region', { name: 'Account' }).getByRole('button', { name: 'ru' }).click()
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible()
})
