import { test, expect } from '@playwright/test'
import {
  newTestUser,
  register,
  registerToOnboarding,
  login,
  completeOnboardingQuickly,
  cleanupTestUsers,
} from './helpers'

test.afterAll(cleanupTestUsers)

// =============================================================================
// Route protection
// =============================================================================
test('unauthenticated visitor is redirected from dashboard to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/auth\/login\?next=%2Fdashboard/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('unauthenticated visitor is redirected from onboarding to login', async ({ page }) => {
  await page.goto('/onboarding/business')
  await expect(page).toHaveURL(/\/auth\/login/)
})

// =============================================================================
// Validation
// =============================================================================
test('register rejects a weak password', async ({ page }) => {
  const user = { ...newTestUser(), password: 'short' }
  await register(page, user)
  await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
  await expect(page).toHaveURL(/\/auth\/register/)
})

test('login rejects wrong credentials', async ({ page }) => {
  await login(page, 'nobody@evano-test.dev', 'Wrong-password-1')
  await expect(page.getByText('Incorrect email or password.')).toBeVisible()
})

// =============================================================================
// Full account lifecycle: register → onboarding → dashboard → sign out → sign in
// =============================================================================
test('register, onboard, see dashboard, sign out, sign back in', async ({ page }) => {
  const user = newTestUser()
  const businessName = `Lifecycle Studio ${user.fullName.slice(-4)}`

  // 1. Register → onboarding wizard → dashboard
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, businessName)

  // 2. Dashboard shows the business from onboarding
  const sidebar = page.locator('aside')
  await expect(sidebar.getByText(businessName)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await expect(page.getByText('AI Receptionist', { exact: true }).last()).toBeVisible()
  await expect(page.getByText('draft')).toBeVisible()
  await expect(page.getByText('Calls today')).toBeVisible()
  await expect(page.getByText('No calls yet')).toBeVisible()

  // 3. Signed-in users are bounced away from auth pages
  await page.goto('/auth/login')
  await expect(page).toHaveURL(/\/dashboard$/)

  // 4. Sign out → back on login, dashboard is protected again
  await sidebar.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/auth\/login/)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/auth\/login/)

  // 5. Sign back in → straight to dashboard (onboarding already done)
  await login(page, user.email, user.password)
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })
  await expect(sidebar.getByText(businessName)).toBeVisible()
})
