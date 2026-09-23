import 'server-only'

// =============================================================================
// Minimal Vapi REST client (server-only — uses the private API key)
// Shapes verified against https://api.vapi.ai/api-json
// =============================================================================

const VAPI_BASE_URL = 'https://api.vapi.ai'

export class VapiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'VapiError'
  }
}

async function vapiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = process.env.VOICE_PROVIDER_API_KEY
  if (!apiKey) throw new VapiError('VOICE_PROVIDER_API_KEY is not set', 500)

  const res = await fetch(`${VAPI_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    // Vapi errors look like { message: string | string[], error, statusCode }
    const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null
    const message = Array.isArray(body?.message) ? body.message.join('; ') : body?.message
    throw new VapiError(message || `Vapi request failed (${res.status})`, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ---------------------------------------------------------------- Assistants

export type VapiAssistant = {
  id: string
  name?: string
  metadata?: Record<string, unknown>
}

export function getAssistant(id: string) {
  return vapiFetch<VapiAssistant>(`/assistant/${encodeURIComponent(id)}`)
}

export function createAssistant(payload: Record<string, unknown>) {
  return vapiFetch<VapiAssistant>('/assistant', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateAssistant(id: string, payload: Record<string, unknown>) {
  return vapiFetch<VapiAssistant>(`/assistant/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteAssistant(id: string) {
  return vapiFetch<void>(`/assistant/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ------------------------------------------------------------- Phone numbers

export type VapiPhoneNumber = {
  id: string
  number?: string
  provider: string
  assistantId?: string | null
  status?: string
}

export function importTwilioNumber(payload: {
  number: string
  twilioAccountSid: string
  twilioAuthToken: string
  name: string
  server: { url: string; headers: Record<string, string> }
}) {
  return vapiFetch<VapiPhoneNumber>('/phone-number', {
    method: 'POST',
    body: JSON.stringify({ provider: 'twilio', ...payload }),
  })
}

/** Attach (or detach with `null`) the assistant that answers this number. */
export function setPhoneNumberAssistant(id: string, assistantId: string | null) {
  return vapiFetch<VapiPhoneNumber>(`/phone-number/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ assistantId }),
  })
}

export function deletePhoneNumber(id: string) {
  return vapiFetch<void>(`/phone-number/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
