'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { disconnect, getBusy } from '@/lib/integrations/google-calendar'
import { syncMissingCalendarEvents } from '@/lib/bookings/service'
import type { ActionResult } from '@/lib/actions/auth'
import { getI18n } from '@/lib/i18n/server'

// =============================================================================
// Disconnect Google Calendar (revokes the token at Google, deletes our copy).
// Existing calendar events are left in place.
// =============================================================================
export async function disconnectGoogleCalendarAction(): Promise<ActionResult> {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')

  try {
    await disconnect(auth.profile.organization_id)
  } catch (err) {
    console.error('[integrations.disconnect]', err)
    return { success: false, error: (await getI18n()).t.errors.googleDisconnectFailed }
  }
  revalidatePath('/dashboard/integrations')
  return { success: true }
}

// =============================================================================
// "Sync now": test the calendar connection and push any missing booking events
// =============================================================================
export async function syncGoogleCalendarAction(): Promise<ActionResult & { created?: number }> {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  const orgId = auth.profile.organization_id

  // A small free/busy query doubles as a health check (records lastError)
  await getBusy(orgId, new Date(), new Date(Date.now() + 60 * 60 * 1000))
  const created = await syncMissingCalendarEvents(orgId)
  revalidatePath('/dashboard/integrations')
  return { success: true, created }
}
