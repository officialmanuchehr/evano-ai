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
// Dashboard → AI Receptionist settings
// =============================================================================
test('owner can update the receptionist settings', async ({ page }) => {
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Agent Test ${user.fullName.slice(-4)}`)

  // Reach the page from the sidebar
  await page.locator('aside').getByRole('link', { name: 'AI Receptionist' }).click()
  await expect(page).toHaveURL(/\/dashboard\/agent$/)
  await expect(page.getByRole('heading', { name: 'AI Receptionist' })).toBeVisible()
  await expect(page.getByText('Draft', { exact: true })).toBeVisible()

  // Edit every setting
  await page.getByLabel('Receptionist name').fill('Sofia')
  // Switching to Russian offers native Russian voices and translates the default greeting
  const businessName = `Agent Test ${user.fullName.slice(-4)}`
  await expect(page.getByLabel('Greeting')).toHaveValue(`Thank you for calling ${businessName}. How can I help you today?`)
  await page.getByLabel('Language').selectOption('ru-RU')
  await expect(page.getByLabel('Greeting')).toHaveValue(`Здравствуйте! Вы позвонили в ${businessName}. Чем могу помочь?`)
  await expect(page.getByLabel('Voice').locator('option')).toHaveText(['Svetlana (female)', 'Dariya (female)', 'Dmitry (male)'])
  await page.getByLabel('Voice').selectOption('azure:ru-RU-DmitryNeural')
  await page.getByLabel('Greeting').fill('Hello, this is Sofia. How can I help you today?')
  await expect(page.getByText('Sofia says')).toBeVisible() // live preview follows the inputs
  await page.getByText('Friendly', { exact: true }).click()
  await page.getByText('Short', { exact: true }).click()
  await page.getByLabel('Custom instructions').fill('Always ask for the caller name first.')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Settings saved')).toBeVisible({ timeout: 15_000 })

  // Survives a reload
  await page.reload()
  await expect(page.getByLabel('Receptionist name')).toHaveValue('Sofia')
  await expect(page.getByLabel('Language')).toHaveValue('ru-RU')
  await expect(page.getByLabel('Voice')).toHaveValue('azure:ru-RU-DmitryNeural')
  await expect(page.getByLabel('Custom instructions')).toHaveValue('Always ask for the caller name first.')

  // And in the database
  const { organization_id } = await getProfile(user.email)
  const { data: agent } = await admin
    .from('ai_agents')
    .select('name, language, voice_id, greeting, tone, response_length, system_prompt, status')
    .eq('organization_id', organization_id)
    .single()
  expect(agent).toEqual({
    name: 'Sofia',
    language: 'ru-RU',
    voice_id: 'azure:ru-RU-DmitryNeural',
    greeting: 'Hello, this is Sofia. How can I help you today?',
    tone: 'friendly',
    response_length: 'short',
    system_prompt: 'Always ask for the caller name first.',
    status: 'draft',
  })
})

test('receptionist settings reject a too-short greeting', async ({ page }) => {
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Agent Validation ${user.fullName.slice(-4)}`)

  await page.goto('/dashboard/agent')
  await page.getByLabel('Greeting').fill('Hi')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Greeting must be at least 10 characters')).toBeVisible({ timeout: 15_000 })
})
