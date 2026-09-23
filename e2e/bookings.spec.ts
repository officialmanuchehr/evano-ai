import { test, expect, type APIRequestContext } from '@playwright/test'
import { resolveDate, toIsoDate } from '../lib/bookings/availability'
import {
  admin,
  newTestUser,
  registerToOnboarding,
  completeOnboardingQuickly,
  getProfile,
  cleanupTestUsers,
} from './helpers'

test.afterAll(cleanupTestUsers)

const secret = () => ({ 'x-evano-secret': process.env.VOICE_PROVIDER_WEBHOOK_SECRET! })

/** Send one Vapi-shaped tool call to the webhook and return its result text. */
async function tool(request: APIRequestContext, assistantId: string, name: string, args: Record<string, string>) {
  const res = await request.post('/api/vapi/webhook', {
    headers: secret(),
    data: {
      message: {
        type: 'tool-calls',
        call: { id: `e2e-tool-call-${assistantId}`, assistantId, customer: { number: '+992900001111' } },
        toolCallList: [{ id: `tc-${Date.now()}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
      },
    },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  return body.results[0].result as string
}

// =============================================================================
// AI booking tools (what the receptionist calls mid-conversation)
// =============================================================================
test('receptionist checks availability and books, refusing clashes and closed days', async ({ page, request }) => {
  test.setTimeout(120_000)
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Booking AI ${user.fullName.slice(-4)}`) // default hours: Mon–Fri 9–17
  const { organization_id } = await getProfile(user.email)
  const assistantId = `e2e-assistant-book-${Date.now()}`
  await admin.from('ai_agents').update({ provider_agent_id: assistantId }).eq('organization_id', organization_id)

  // Monday: open, first slot 9:00
  const before = await tool(request, assistantId, 'check_availability', { date: 'next monday' })
  expect(before).toContain('Free start times on Monday')
  expect(before).toMatch(/: 9:00, 9:30,/)

  // Book 9:00 (phone falls back to the caller's number)
  const booked = await tool(request, assistantId, 'book_appointment', { customer_name: 'Dilnoza', date: 'next monday', time: '9:00' })
  expect(booked).toContain('Booked:')
  expect(booked).toContain('at 9:00')

  // 9:00 is gone, the same slot can't be booked twice
  const after = await tool(request, assistantId, 'check_availability', { date: 'next monday' })
  expect(after).toMatch(/: 9:30,/)
  const clash = await tool(request, assistantId, 'book_appointment', { customer_name: 'Someone', date: 'next monday', time: '9:00' })
  expect(clash).toContain('Not booked')
  expect(clash).toContain('already booked')

  // Outside hours and closed days are refused
  const late = await tool(request, assistantId, 'book_appointment', { customer_name: 'Late', date: 'next monday', time: '18:00' })
  expect(late).toContain('not open')
  const sunday = await tool(request, assistantId, 'check_availability', { date: 'next sunday' })
  expect(sunday).toContain('closed')
  expect(sunday).toContain('Monday, Tuesday, Wednesday, Thursday, Friday')

  // Stored as an AI booking
  const { data: rows } = await admin
    .from('bookings')
    .select('customer_name, customer_phone, status, created_by')
    .eq('organization_id', organization_id)
  expect(rows).toEqual([{ customer_name: 'Dilnoza', customer_phone: '+992900001111', status: 'confirmed', created_by: 'ai' }])

  // Visible on the dashboard as booked by AI
  await page.goto('/dashboard/bookings')
  await expect(page.getByText('Dilnoza')).toBeVisible()
  await expect(page.getByText('Booked by AI')).toBeVisible()
})

// =============================================================================
// Dashboard: create, clash, reschedule, cancel
// =============================================================================
test('owner creates, reschedules and cancels bookings from the dashboard', async ({ page }) => {
  test.setTimeout(120_000)
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Booking UI ${user.fullName.slice(-4)}`)
  const { organization_id } = await getProfile(user.email)
  const { data: org } = await admin.from('organizations').select('timezone').eq('id', organization_id).single()
  const tuesday = toIsoDate(resolveDate('next tuesday', org!.timezone)!)

  // Create
  await page.goto('/dashboard/bookings')
  await page.getByRole('link', { name: 'New booking' }).click()
  await page.getByLabel('Customer name').fill('Farrukh')
  await page.getByLabel('Phone').fill('+992900002222')
  await page.getByLabel('Date').fill(tuesday)
  await page.getByLabel('Time').fill('10:00')
  await page.getByRole('button', { name: 'Create booking' }).click()
  await expect(page).toHaveURL(/\/dashboard\/bookings$/, { timeout: 15_000 })
  await expect(page.getByText('Farrukh')).toBeVisible()
  await expect(page.getByText('Added by you')).toBeVisible()

  // Clash at 10:15 (overlaps 10:00–10:30) is refused and the form keeps its values
  await page.getByRole('link', { name: 'New booking' }).click()
  await page.getByLabel('Customer name').fill('Clash')
  await page.getByLabel('Date').fill(tuesday)
  await page.getByLabel('Time').fill('10:15')
  await page.getByRole('button', { name: 'Create booking' }).click()
  await expect(page.getByText(/already booked/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByLabel('Customer name')).toHaveValue('Clash')

  // Reschedule Farrukh to 11:00
  await page.goto('/dashboard/bookings')
  await page.getByRole('link', { name: 'Reschedule' }).click()
  await expect(page.getByLabel('Customer name')).toHaveValue('Farrukh')
  await page.getByLabel('Time').fill('11:00')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL(/\/dashboard\/bookings$/, { timeout: 15_000 })
  await expect(page.getByText('Rescheduled')).toBeVisible()
  await expect(page.getByText(/11:00 AM/)).toBeVisible()

  // Cancel → moves to the Cancelled tab
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Booking cancelled')).toBeVisible()
  await expect(page.getByText('No upcoming bookings')).toBeVisible()
  await page.getByRole('link', { name: 'Cancelled' }).click()
  await expect(page.getByText('Farrukh')).toBeVisible()
})
