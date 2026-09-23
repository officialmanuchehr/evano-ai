import { test, expect } from '@playwright/test'
import { newTestUser, registerToOnboarding, completeOnboardingQuickly, cleanupTestUsers } from './helpers'

test.afterAll(cleanupTestUsers)

// =============================================================================
// Light / dark theme
// =============================================================================
test('light is the default; dark mode can be chosen and is remembered', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  await page.getByRole('button', { name: 'Switch to dark theme' }).first().click()
  await expect(page.locator('html')).toHaveClass(/dark/)

  // Remembered across pages and reloads
  await page.goto('/auth/login')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)

  // Back to light
  await page.getByRole('button', { name: 'Switch to light theme' }).first().click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
})

test('dashboard sidebar has the theme switch', async ({ page }) => {
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Theme Test ${user.fullName.slice(-4)}`)

  await page.locator('aside').getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.goto('/dashboard/settings')
  await expect(page.locator('html')).toHaveClass(/dark/)
})
