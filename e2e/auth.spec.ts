import { test, expect } from '@playwright/test'
import {
  admin,
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
  // A failed submit must not wipe what the user typed
  await expect(page.getByLabel('Full name')).toHaveValue(user.fullName)
  await expect(page.getByLabel('Email address')).toHaveValue(user.email)
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

// =============================================================================
// Password reset — uses the same link Supabase emails (generated via admin API)
// =============================================================================
test('password reset link lets the user set a new password', async ({ page }) => {
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Reset Test ${user.fullName.slice(-4)}`)
  await page.locator('aside').getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/auth\/login/)

  // Request the reset from the UI (sends the real email)
  await page.goto('/auth/forgot-password')
  await page.getByLabel('Email address').fill(user.email)
  await page.getByRole('button', { name: /send/i }).click()
  await expect(page.getByText('Check your email')).toBeVisible({ timeout: 15_000 })

  // Follow a recovery link (token_hash style — what the recommended email template sends)
  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: user.email })
  expect(error).toBeNull()
  await page.goto(`/auth/confirm?token_hash=${data.properties!.hashed_token}&type=recovery&next=/auth/reset-password`)
  await expect(page).toHaveURL(/\/auth\/reset-password$/)

  // Mismatch is rejected and keeps the typed values
  const newPassword = 'Brand-New-Pass-2026'
  await page.getByLabel('New password').fill(newPassword)
  await page.getByLabel('Confirm new password').fill('Something-Else-1')
  await page.getByRole('button', { name: 'Save new password' }).click()
  await expect(page.getByText('Passwords do not match')).toBeVisible()
  await expect(page.getByLabel('New password')).toHaveValue(newPassword)

  // Save → signed in on the dashboard
  await page.getByLabel('Confirm new password').fill(newPassword)
  await page.getByRole('button', { name: 'Save new password' }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })

  // Old password no longer works, new one does
  await page.locator('aside').getByRole('button', { name: 'Sign out' }).click()
  await login(page, user.email, user.password)
  await expect(page.getByText('Incorrect email or password.')).toBeVisible()
  await login(page, user.email, newPassword)
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })
})

test('reused or invalid reset link is rejected', async ({ page }) => {
  await page.goto('/auth/confirm?token_hash=not-a-real-token&type=recovery&next=/auth/reset-password')
  await expect(page).toHaveURL(/\/auth\/forgot-password\?error=link/)
  await expect(page.getByText('That reset link has expired or was already used.')).toBeVisible()
})

test('confirm route never redirects off-site', async ({ page }) => {
  // Even with a bad token the `next` param must not be followed to another origin
  const appOrigin = new URL(test.info().project.use.baseURL!).origin
  await page.goto('/auth/confirm?code=bad&next=//evil.example.com')
  expect(new URL(page.url()).origin).toBe(appOrigin)
})
