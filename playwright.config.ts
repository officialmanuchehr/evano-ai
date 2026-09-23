import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

// Tests talk to the real Supabase project (for cleanup), so load .env.local
loadEnv({ path: '.env.local' })

// 127.0.0.1 (not localhost): avoids stale localhost cookies from other projects
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'

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
  // Reuse `npm run dev` if it's already running, otherwise start it
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
