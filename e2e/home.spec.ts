import { test, expect } from '@playwright/test'

// =============================================================================
// Public landing page
// =============================================================================
test('home page shows the Evano AI landing page', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Evano AI — Your AI receptionist, 24/7')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Never miss a customer call again.')
  await expect(page.getByText('To get started, edit the')).toHaveCount(0) // starter page is gone
})

test('home page calls to action lead to signup and sign in', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Start free' }).click()
  await expect(page).toHaveURL(/\/auth\/register$/)

  await page.goto('/')
  await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/auth\/login$/)
})
