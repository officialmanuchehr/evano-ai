import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// =============================================================================
// Helpers
// =============================================================================

// Admin client — only used to clean up the accounts these tests create
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const createdEmails: string[] = []

function newTestUser() {
  const id = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`
  const user = {
    fullName: `E2E Tester ${id.slice(-4)}`,
    email: `e2e.${id}@evano-test.dev`,
    password: 'Evano-e2e-2026',
  }
  createdEmails.push(user.email)
  return user
}

async function register(page: Page, user: ReturnType<typeof newTestUser>) {
  await page.goto('/auth/register')
  await page.getByLabel('Full name').fill(user.fullName)
  await page.getByLabel('Email address').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Create account' }).click()
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

// =============================================================================
// Cleanup — delete test users and their organizations (cascades to all org data)
// =============================================================================
test.afterAll(async () => {
  for (const email of createdEmails) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, organization_id')
      .eq('email', email)
      .maybeSingle()

    if (profile) {
      await admin.auth.admin.deleteUser(profile.id)
      await admin.from('organizations').delete().eq('id', profile.organization_id)
    }
  }
})

// =============================================================================
// Route protection
// =============================================================================
test('unauthenticated visitor is redirected from dashboard to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/auth\/login\?next=%2Fdashboard/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
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
// Full account lifecycle: register → dashboard → sign out → sign in
// =============================================================================
test('register, see dashboard, sign out, sign back in', async ({ page }) => {
  const user = newTestUser()
  const orgName = `${user.fullName}'s Business`

  // 1. Register → redirected to onboarding (page not built yet, URL is enough)
  await register(page, user)
  await expect(page).toHaveURL(/\/onboarding\/business/)

  // 2. Dashboard shows the org seeded during signup
  await page.goto('/dashboard')
  const sidebar = page.locator('aside')
  await expect(sidebar.getByText(orgName)).toBeVisible()
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

  // 5. Sign back in with the same credentials
  await login(page, user.email, user.password)
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(sidebar.getByText(orgName)).toBeVisible()
})
