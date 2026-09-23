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

const secret = () => ({ 'x-evano-secret': process.env.VOICE_PROVIDER_WEBHOOK_SECRET! })

// =============================================================================
// Call handling — Vapi-shaped webhook events → calls table → Claude summary
// =============================================================================
test('webhook records a call from start to summary', async ({ page, request }) => {
  test.setTimeout(120_000)

  // An onboarded org whose agent is linked to a (test) Vapi assistant id
  const user = newTestUser()
  await registerToOnboarding(page, user)
  await completeOnboardingQuickly(page, `Calls Test ${user.fullName.slice(-4)}`)
  const { organization_id } = await getProfile(user.email)
  const assistantId = `e2e-assistant-${Date.now()}`
  await admin.from('ai_agents').update({ provider_agent_id: assistantId }).eq('organization_id', organization_id)

  const callId = `e2e-call-${Date.now()}`
  const startedAt = new Date(Date.now() - 95_000).toISOString()
  const endedAt = new Date().toISOString()
  const call = { id: callId, assistantId, customer: { number: '+992901234567' }, startedAt }

  // 1. Call starts → shows as in progress
  const started = await request.post('/api/vapi/webhook', {
    headers: secret(),
    data: { message: { type: 'status-update', status: 'in-progress', call } },
  })
  expect(started.status()).toBe(200)
  const { data: live } = await admin.from('calls').select('status').eq('provider_call_id', callId).single()
  expect(live?.status).toBe('in_progress')

  // 2. Call ends → full report
  const ended = await request.post('/api/vapi/webhook', {
    headers: secret(),
    data: {
      message: {
        type: 'end-of-call-report',
        endedReason: 'customer-ended-call',
        startedAt,
        endedAt,
        call,
        artifact: {
          recordingUrl: 'https://storage.vapi.ai/e2e-recording.wav',
          messages: [
            { role: 'system', message: 'system prompt — must not be stored' },
            { role: 'bot', message: 'Thank you for calling. How can I help?', secondsFromStart: 0.5 },
            { role: 'user', message: 'Hi, I am Omar. I want to book a haircut tomorrow at 3pm.', secondsFromStart: 4 },
            { role: 'bot', message: 'Got it, Omar — haircut tomorrow at 3pm. The team will confirm.', secondsFromStart: 9 },
          ],
        },
        analysis: {},
      },
    },
  })
  expect(ended.status()).toBe(200)
  expect(await ended.json()).toMatchObject({ saved: true })

  const { data: saved } = await admin
    .from('calls')
    .select('status, caller_number, duration_seconds, recording_url, transcript')
    .eq('provider_call_id', callId)
    .single()
  expect(saved).toMatchObject({
    status: 'completed',
    caller_number: '+992901234567',
    duration_seconds: 95,
    recording_url: 'https://storage.vapi.ai/e2e-recording.wav',
  })
  expect(saved?.transcript).toEqual([
    { role: 'assistant', text: 'Thank you for calling. How can I help?' },
    { role: 'caller', text: 'Hi, I am Omar. I want to book a haircut tomorrow at 3pm.' },
    { role: 'assistant', text: 'Got it, Omar — haircut tomorrow at 3pm. The team will confirm.' },
  ])

  // 3. Claude writes the summary after the webhook has responded
  await expect
    .poll(
      async () => {
        const { data } = await admin.from('calls').select('summary, purpose').eq('provider_call_id', callId).single()
        return data
      },
      { timeout: 60_000, intervals: [2_000] }
    )
    .toMatchObject({ purpose: 'booking', summary: expect.stringContaining('Omar') })

  // 4. Usage counted for this month
  const { data: usage } = await admin
    .from('usage')
    .select('calls_count, voice_minutes')
    .eq('organization_id', organization_id)
    .single()
  expect(usage).toEqual({ calls_count: 1, voice_minutes: 2 })

  // 5. Dashboard overview shows it
  await page.goto('/dashboard')
  await expect(page.getByText('+992901234567')).toBeVisible()
})

test('webhook ignores reports for unknown assistants', async ({ request }) => {
  const res = await request.post('/api/vapi/webhook', {
    headers: secret(),
    data: {
      message: {
        type: 'end-of-call-report',
        endedReason: 'customer-ended-call',
        call: { id: `e2e-orphan-${Date.now()}`, assistantId: 'not-ours' },
        artifact: { messages: [] },
        analysis: {},
      },
    },
  })
  expect(res.status()).toBe(200)
  expect(await res.json()).toMatchObject({ saved: false })
})
