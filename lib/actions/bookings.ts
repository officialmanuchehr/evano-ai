'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { cancelBooking, saveBooking } from '@/lib/bookings/service'
import type { ActionResult } from '@/lib/actions/auth'
import { getI18n } from '@/lib/i18n/server'
import { INTL_LOCALE, interpolate } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

// =============================================================================
// Dashboard booking actions — same rules as the AI (lib/bookings/service.ts),
// except the owner may book outside opening hours if they tick the box.
// =============================================================================

async function requireOrgId() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  return auth.profile.organization_id
}

const bookingSchema = (e: Dictionary['errors']) => z.object({
  customerName: z.string().trim().min(2, e.customerName).max(120),
  customerPhone: z.string().trim().max(40),
  service: z.string().trim().max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, e.chooseDate),
  time: z.string().regex(/^\d{2}:\d{2}$/, e.chooseTime),
  notes: z.string().trim().max(1000),
  allowOutsideHours: z.boolean(),
})

function parseBooking(formData: FormData, e: Dictionary['errors']) {
  return bookingSchema(e).safeParse({
    customerName: formData.get('customerName') ?? '',
    customerPhone: formData.get('customerPhone') ?? '',
    service: formData.get('service') ?? '',
    date: formData.get('date') ?? '',
    time: formData.get('time') ?? '',
    notes: formData.get('notes') ?? '',
    allowOutsideHours: formData.get('allowOutsideHours') === 'on',
  })
}

export async function createBookingAction(formData: FormData): Promise<ActionResult> {
  const { locale, t } = await getI18n()
  const parsed = parseBooking(formData, t.errors)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }
  const orgId = await requireOrgId()

  const { allowOutsideHours, ...input } = parsed.data
  const result = await saveBooking(orgId, input, { createdBy: 'human', allowOutsideHours, lang: INTL_LOCALE[locale] })
  if (!result.ok) return { success: false, error: interpolate(t.errors.booking[result.code], result.vars) }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard/bookings')
}

export async function rescheduleBookingAction(bookingId: string, formData: FormData): Promise<ActionResult> {
  const { locale, t } = await getI18n()
  const parsed = parseBooking(formData, t.errors)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }
  const orgId = await requireOrgId()

  const { allowOutsideHours, ...input } = parsed.data
  const result = await saveBooking(orgId, input, {
    createdBy: 'human',
    rescheduleId: bookingId,
    allowOutsideHours,
    lang: INTL_LOCALE[locale],
  })
  if (!result.ok) return { success: false, error: interpolate(t.errors.booking[result.code], result.vars) }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard/bookings')
}

const STATUS_CHANGES = ['cancelled', 'completed', 'no_show'] as const

export async function setBookingStatusAction(
  bookingId: string,
  status: (typeof STATUS_CHANGES)[number]
): Promise<ActionResult> {
  const { t } = await getI18n()
  if (!STATUS_CHANGES.includes(status)) return { success: false, error: t.errors.bookingUpdateFailed }
  const orgId = await requireOrgId()

  // Cancelling also removes the Google Calendar event
  if (status === 'cancelled') {
    if (!(await cancelBooking(orgId, bookingId))) return { success: false, error: t.errors.bookingUpdateFailed }
    revalidatePath('/dashboard', 'layout')
    return { success: true }
  }

  // User client: RLS limits this to the caller's own org
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
    .eq('organization_id', orgId)
    .select('id')
  if (error || !data?.length) return { success: false, error: t.errors.bookingUpdateFailed }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
