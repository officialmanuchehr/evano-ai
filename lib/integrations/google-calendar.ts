import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import { decryptSecret, encryptSecret } from '@/lib/crypto'
import type { Busy } from '@/lib/bookings/availability'

// =============================================================================
// Google Calendar integration (OAuth 2.0 web flow + Calendar v3 REST).
// Only the refresh token is stored — AES-GCM encrypted in
// integrations.encrypted_credentials. Access tokens are minted per request.
// =============================================================================

const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events', // create/move/delete booking events
  'https://www.googleapis.com/auth/calendar.freebusy', // read busy times only (no event details)
]

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const PROVIDER = 'google_calendar' as const

function oauthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) throw new Error('Google OAuth env vars are not set')
  return { clientId, clientSecret, redirectUri }
}

// ------------------------------------------------------------------- OAuth

export function buildAuthUrl(state: string) {
  const { clientId, redirectUri } = oauthConfig()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline', // we need a refresh token
    prompt: 'consent', // …every time, so reconnecting always returns one
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

type TokenResponse = { access_token: string; refresh_token?: string; id_token?: string; error?: string }

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    cache: 'no-store',
  })
  const json = (await res.json()) as TokenResponse
  if (!res.ok) throw new Error(`Google token error: ${json.error ?? res.status}`)
  return json
}

/** Exchange the callback `code`, then store the (encrypted) refresh token for the org. */
export async function completeConnection(orgId: string, code: string) {
  const { clientId, clientSecret, redirectUri } = oauthConfig()
  const tokens = await tokenRequest({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  if (!tokens.refresh_token) throw new Error('Google did not return a refresh token')

  // id_token comes straight from Google's token endpoint over TLS — safe to read the email claim
  const email = tokens.id_token
    ? (JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString()) as { email?: string }).email ?? null
    : null

  const { error } = await createAdminClient()
    .from('integrations')
    .upsert(
      {
        organization_id: orgId,
        provider: PROVIDER,
        provider_account_id: email,
        encrypted_credentials: encryptSecret(tokens.refresh_token),
        metadata: { email, calendarId: 'primary', connectedAt: new Date().toISOString() },
        status: 'connected',
      },
      { onConflict: 'organization_id,provider' }
    )
  if (error) throw new Error(`Could not save Google connection: ${error.message}`)
  return email
}

export async function disconnect(orgId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('integrations')
    .select('encrypted_credentials')
    .eq('organization_id', orgId)
    .eq('provider', PROVIDER)
    .maybeSingle()

  if (data?.encrypted_credentials) {
    // Revoke at Google too, so the token is dead even if our copy leaked.
    // Best effort: a corrupted/undecryptable token must not block disconnecting.
    try {
      const token = decryptSecret(data.encrypted_credentials)
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' })
    } catch (err) {
      console.warn('[google] revoke skipped', err)
    }
  }
  const { error } = await db.from('integrations').delete().eq('organization_id', orgId).eq('provider', PROVIDER)
  if (error) throw new Error(`Could not remove Google connection: ${error.message}`)
}

// ------------------------------------------------------------- API access

/** Short-lived access token for the org, or null when not connected. */
async function accessToken(orgId: string): Promise<string | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('integrations')
    .select('encrypted_credentials')
    .eq('organization_id', orgId)
    .eq('provider', PROVIDER)
    .eq('status', 'connected')
    .maybeSingle()
  if (!data?.encrypted_credentials) return null

  const { clientId, clientSecret } = oauthConfig()
  try {
    const tokens = await tokenRequest({
      refresh_token: decryptSecret(data.encrypted_credentials),
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    })
    return tokens.access_token
  } catch (err) {
    // Revoked in Google / password changed → show "reconnect" in the dashboard
    console.error('[google] refresh failed', err)
    await db.from('integrations').update({ status: 'error' }).eq('organization_id', orgId).eq('provider', PROVIDER)
    return null
  }
}

/**
 * Remember whether the last Calendar API call worked, so the Integrations page
 * can show the real error (e.g. "Calendar API disabled") instead of failing silently.
 */
async function recordSyncHealth(orgId: string, error: string | null) {
  const db = createAdminClient()
  const { data } = await db.from('integrations').select('metadata').eq('organization_id', orgId).eq('provider', PROVIDER).maybeSingle()
  const metadata = (data?.metadata ?? {}) as Record<string, unknown>
  if ((metadata.lastError ?? null) === error) return // nothing changed — skip the write
  await db
    .from('integrations')
    .update({ metadata: { ...metadata, lastError: error, lastErrorAt: error ? new Date().toISOString() : null } })
    .eq('organization_id', orgId)
    .eq('provider', PROVIDER)
}

async function calendarFetch(orgId: string, path: string, init: RequestInit = {}) {
  const token = await accessToken(orgId)
  if (!token) return null
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
  })
  if (res.ok || res.status === 404 || res.status === 410) {
    await recordSyncHealth(orgId, null)
  } else {
    const body = (await res.clone().json().catch(() => null)) as { error?: { message?: string } } | null
    await recordSyncHealth(orgId, `${res.status}: ${body?.error?.message ?? res.statusText}`.slice(0, 300))
  }
  return res
}

/** Busy intervals in the connected calendar (empty when not connected or on error). */
export async function getBusy(orgId: string, from: Date, to: Date): Promise<Busy[]> {
  try {
    const res = await calendarFetch(orgId, '/freeBusy', {
      method: 'POST',
      body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: 'primary' }] }),
    })
    if (!res?.ok) {
      if (res) console.error('[google] freeBusy', res.status, await res.text())
      return []
    }
    const json = (await res.json()) as { calendars?: { primary?: { busy?: { start: string; end: string }[] } } }
    return (json.calendars?.primary?.busy ?? []).map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
  } catch (err) {
    console.error('[google] freeBusy failed', err)
    return []
  }
}

export type CalendarEventInput = {
  customerName: string
  customerPhone: string | null
  service: string | null
  notes: string | null
  start: Date
  end: Date
  timeZone: string
  createdBy: 'ai' | 'human'
}

function eventBody(e: CalendarEventInput) {
  return {
    summary: `${e.service ?? 'Appointment'} — ${e.customerName}`,
    description: [
      e.customerPhone && `Phone: ${e.customerPhone}`,
      e.notes && `Notes: ${e.notes}`,
      e.createdBy === 'ai' ? 'Booked by your Evano AI receptionist.' : 'Added in Evano AI.',
    ]
      .filter(Boolean)
      .join('\n'),
    start: { dateTime: e.start.toISOString(), timeZone: e.timeZone },
    end: { dateTime: e.end.toISOString(), timeZone: e.timeZone },
  }
}

/** Returns the Google event id, or null when not connected / on failure. */
export async function createEvent(orgId: string, e: CalendarEventInput): Promise<string | null> {
  try {
    const res = await calendarFetch(orgId, '/calendars/primary/events', { method: 'POST', body: JSON.stringify(eventBody(e)) })
    if (!res?.ok) {
      if (res) console.error('[google] create event', res.status, await res.text())
      return null
    }
    return ((await res.json()) as { id: string }).id
  } catch (err) {
    console.error('[google] create event failed', err)
    return null
  }
}

export async function updateEvent(orgId: string, eventId: string, e: CalendarEventInput) {
  try {
    const res = await calendarFetch(orgId, `/calendars/primary/events/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      body: JSON.stringify(eventBody(e)),
    })
    if (res && !res.ok) console.error('[google] update event', res.status, await res.text())
  } catch (err) {
    console.error('[google] update event failed', err)
  }
}

export async function deleteEvent(orgId: string, eventId: string) {
  try {
    const res = await calendarFetch(orgId, `/calendars/primary/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
    if (res && !res.ok && res.status !== 404 && res.status !== 410) console.error('[google] delete event', res.status)
  } catch (err) {
    console.error('[google] delete event failed', err)
  }
}
