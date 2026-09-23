'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { disconnect } from '@/lib/integrations/google-calendar'
import type { ActionResult } from '@/lib/actions/auth'

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
    return { success: false, error: 'Could not disconnect Google Calendar. Please try again.' }
  }
  revalidatePath('/dashboard/integrations')
  return { success: true }
}
