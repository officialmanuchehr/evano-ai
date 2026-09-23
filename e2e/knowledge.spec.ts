import { test, expect } from '@playwright/test'
import {
  admin,
  newTestUser,
  registerToOnboarding,
  completeOnboardingQuickly,
  getProfile,
  cleanupTestUsers,
  vapiRequest,
} from './helpers'

test.afterAll(cleanupTestUsers)

// =============================================================================
// Dashboard → Knowledge
// =============================================================================
test('owner edits services and FAQs and the live receptionist picks them up', async ({ page }) => {
  test.setTimeout(150_000)
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Knowledge Test ${user.fullName.slice(-4)}`)
  const { organization_id } = await getProfile(user.email)

  // A real Vapi assistant for this org, so saving must refresh it
  const created = await vapiRequest('/assistant', {
    method: 'POST',
    body: JSON.stringify({ name: 'evano-e2e-knowledge', metadata: { organizationId: organization_id } }),
  })
  const assistantId = ((await created.json()) as { id: string }).id
  await admin.from('ai_agents').update({ provider_agent_id: assistantId }).eq('organization_id', organization_id)

  await page.locator('aside').getByRole('link', { name: 'Knowledge' }).click()
  await expect(page).toHaveURL(/\/dashboard\/knowledge$/)
  await expect(page.getByText('No services yet — add the first one.')).toBeVisible()

  // Services
  await page.getByRole('button', { name: 'Add service' }).click()
  await page.getByLabel('Service 1 name').fill('Beard trim')
  await page.getByLabel('Service 1 duration in minutes').fill('20')
  await page.getByLabel('Service 1 price').fill('$15')
  await page.getByRole('button', { name: 'Add service' }).click()
  await page.getByLabel('Service 2 name').fill('Hot towel shave')
  await page.getByRole('button', { name: 'Save services' }).click()
  await expect(page.getByText('Services saved')).toBeVisible({ timeout: 20_000 })

  // FAQs — one active, one switched off
  await page.getByRole('button', { name: 'Add question' }).click()
  await page.getByLabel('FAQ 1 question').fill('Do you take walk-ins?')
  await page.getByLabel('FAQ 1 answer').fill('Yes, until 6pm.')
  await page.getByRole('button', { name: 'Add question' }).click()
  await page.getByLabel('FAQ 2 question').fill('Do you sell gift cards?')
  await page.getByLabel('FAQ 2 answer').fill('Not yet.')
  await page.getByLabel('Active 2').uncheck()
  await page.getByRole('button', { name: 'Save FAQs' }).click()
  await expect(page.getByText('FAQs saved')).toBeVisible({ timeout: 20_000 })

  // Persisted
  await page.reload()
  await expect(page.getByLabel('Service 1 name')).toHaveValue('Beard trim')
  await expect(page.getByLabel('Service 2 name')).toHaveValue('Hot towel shave')
  await expect(page.getByLabel('Active 2')).not.toBeChecked()

  const { data: info } = await admin.from('business_info').select('services').eq('organization_id', organization_id).single()
  expect(info?.services).toEqual([
    { name: 'Beard trim', duration: 20, price: '$15' },
    { name: 'Hot towel shave', duration: 30, price: '' },
  ])
  const { data: faqs } = await admin
    .from('faqs')
    .select('question, is_active')
    .eq('organization_id', organization_id)
    .order('created_at')
  expect(faqs).toEqual([
    { question: 'Do you take walk-ins?', is_active: true },
    { question: 'Do you sell gift cards?', is_active: false },
  ])

  // The live assistant now knows the new service and only the active FAQ
  const live = await (await vapiRequest(`/assistant/${assistantId}`)).json()
  const prompt: string = live.model.messages[0].content
  expect(prompt).toContain('Beard trim (20 min, $15)')
  expect(prompt).toContain('Do you take walk-ins?')
  expect(prompt).not.toContain('gift cards')

  // AI Receptionist summary reflects it too (inactive FAQ not counted)
  await page.goto('/dashboard/agent')
  await expect(page.getByText('Beard trim')).toBeVisible()
  await expect(page.getByText('1 FAQ')).toBeVisible()
})

test('knowledge rejects a service with an invalid duration', async ({ page }) => {
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Knowledge Invalid ${user.fullName.slice(-4)}`)

  await page.goto('/dashboard/knowledge')
  await page.getByRole('button', { name: 'Add service' }).click()
  await page.getByLabel('Service 1 name').fill('Too short')
  await page.getByLabel('Service 1 duration in minutes').fill('2')
  // Bypass the browser's min=5 check to prove the server validates too
  await page.getByLabel('Service 1 duration in minutes').evaluate((el) => el.removeAttribute('min'))
  await page.getByRole('button', { name: 'Save services' }).click()
  await expect(page.getByText('Every service needs a name (duration 5–600 minutes).')).toBeVisible({ timeout: 15_000 })
})
