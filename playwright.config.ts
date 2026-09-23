import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

// Tests talk to the real Supabase project (for cleanup), so load .env.local
loadEnv({ path: '.env.local' })

// Tests run against the deployed Vercel app by default.
// Override with E2E_BASE_URL (e.g. a preview deployment URL).
const baseURL = process.env.E2E_BASE_URL ?? 'https://evano-ai-kappa.vercel.app'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // auth flows share one Supabase project — keep them sequential
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
