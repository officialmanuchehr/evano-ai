import { test, expect } from '@playwright/test'
import { admin, newTestUser, registerToOnboarding, getProfile, cleanupTestUsers } from './helpers'

test.afterAll(cleanupTestUsers)

// =============================================================================
// Gate: a new account can't reach the dashboard until setup is done
// =============================================================================
test('new account is sent to onboarding instead of the dashboard', async ({ page }) => {
  const user = newTestUser()
  await registerToOnboarding(page, user)

  await expect(page.getByRole('heading', { name: 'Tell us about your business' })).toBeVisible()
  // Signup seeds the business name and prefills the contact email
  await expect(page.getByLabel('Business name')).toHaveValue(`${user.fullName}'s Business`)
  await expect(page.getByLabel('Contact email')).toHaveValue(user.email)

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/onboarding\/business/)
})

// =============================================================================
// Full wizard with real data — verified in the database afterwards
// =============================================================================
test('completing all three steps saves everything and unlocks the dashboard', async ({ page }) => {
  const user = newTestUser()
  const businessName = `Neon Dental ${user.fullName.slice(-4)}`
  await registerToOnboarding(page, user)

  // Step 1 — business
  await page.getByLabel('Business name').fill(businessName)
  await page.getByLabel('Industry').selectOption('Dental')
  await page.getByLabel('Timezone').selectOption('Asia/Dushanbe')
  await page.getByLabel('Business phone').fill('+992 90 123 4567')
  await page.getByLabel('Address').fill('Rudaki Ave 10, Dushanbe')
  await page.getByLabel('What does your business do?').fill('Family dental clinic.')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/onboarding\/hours/, { timeout: 15_000 })

  // Back keeps what was saved
  await page.getByRole('link', { name: 'Back' }).click()
  await expect(page.getByLabel('Business name')).toHaveValue(businessName)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/onboarding\/hours/, { timeout: 15_000 })

  // Step 2 — open Saturday 10–14, forward after-hours calls
  await page.getByLabel('Saturday closed').uncheck()
  await page.getByLabel('Saturday opens').fill('10:00')
  await page.getByLabel('Saturday closes').fill('14:00')
  await page.getByLabel('Forward calls to another number').check()
  await page.getByLabel('Forward calls to', { exact: true }).fill('+992 90 765 4321')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/onboarding\/services/, { timeout: 15_000 })

  // Step 3 — one service, one FAQ
  await page.getByLabel('Service 1 name').fill('Teeth cleaning')
  await page.getByLabel('Service 1 duration in minutes').fill('45')
  await page.getByLabel('Service 1 price').fill('$80')
  await page.getByLabel('FAQ 1 question').fill('Do you have parking?')
  await page.getByLabel('FAQ 1 answer').fill('Yes, free parking behind the clinic.')
  await page.getByRole('button', { name: 'Finish setup' }).click()

  // Dashboard unlocked, shows the new name
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })
  await expect(page.locator('aside').getByText(businessName)).toBeVisible()

  // Onboarding is closed once finished
  await page.goto('/onboarding/business')
  await expect(page).toHaveURL(/\/dashboard$/)

  // ---- Verify what landed in the database ----
  const profile = await getProfile(user.email)
  expect(profile.onboarding_completed).toBe(true)
  const orgId = profile.organization_id

  const { data: org } = await admin.from('organizations').select('name, industry, timezone').eq('id', orgId).single()
  expect(org).toEqual({ name: businessName, industry: 'Dental', timezone: 'Asia/Dushanbe' })

  const { data: info } = await admin
    .from('business_info')
    .select('phone, address, description, after_hours_behavior, transfer_number, services')
    .eq('organization_id', orgId)
    .single()
  expect(info).toMatchObject({
    phone: '+992 90 123 4567',
    address: 'Rudaki Ave 10, Dushanbe',
    description: 'Family dental clinic.',
    after_hours_behavior: 'transfer',
    transfer_number: '+992 90 765 4321',
    services: [{ name: 'Teeth cleaning', duration: 45, price: '$80' }],
  })

  const { data: saturday } = await admin
    .from('business_hours')
    .select('is_closed, open_time, close_time')
    .eq('organization_id', orgId)
    .eq('day_of_week', 6)
    .single()
  expect(saturday).toEqual({ is_closed: false, open_time: '10:00:00', close_time: '14:00:00' })

  const { data: faqs } = await admin.from('faqs').select('question, answer').eq('organization_id', orgId)
  expect(faqs).toEqual([{ question: 'Do you have parking?', answer: 'Yes, free parking behind the clinic.' }])

  const { data: agent } = await admin.from('ai_agents').select('greeting').eq('organization_id', orgId).single()
  expect(agent?.greeting).toBe(`Thank you for calling ${businessName}. How can I help you today?`)
})

// =============================================================================
// Validation
// =============================================================================
test('hours step rejects a closing time before the opening time', async ({ page }) => {
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await page.getByLabel('Industry').selectOption('Other')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/onboarding\/hours/, { timeout: 15_000 })

  await page.getByLabel('Monday opens').fill('18:00')
  await page.getByLabel('Monday closes').fill('09:00')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByText('Closing time must be after opening time.')).toBeVisible()
  await expect(page).toHaveURL(/\/onboarding\/hours/)
})
