import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import type { ServiceItem } from '@/lib/onboarding/constants'
import { createEvent, deleteEvent, getBusy, updateEvent } from '@/lib/integrations/google-calendar'
import {
  computeSlots,
  formatDayLabel,
  formatSlot,
  resolveDate,
  todayIn,
  weekdayOf,
  zonedToUtc,
  type LocalDate,
} from '@/lib/bookings/availability'

// =============================================================================
// Booking rules shared by the AI phone tools and the dashboard.
// `orgId` always comes from a trusted source (session or verified webhook).
// =============================================================================

export const DEFAULT_DURATION_MIN = 30
const ACTIVE_STATUSES = ['confirmed', 'rescheduled'] as const

async function loadOrgContext(orgId: string) {
  const db = createAdminClient()
  const [{ data: org }, { data: info }, { data: hours }] = await Promise.all([
    db.from('organizations').select('name, timezone').eq('id', orgId).single(),
    db.from('business_info').select('services').eq('organization_id', orgId).maybeSingle(),
    db.from('business_hours').select('day_of_week, is_closed, open_time, close_time').eq('organization_id', orgId),
  ])
  return {
    timeZone: org?.timezone ?? 'UTC',
    services: (Array.isArray(info?.services) ? info.services : []) as ServiceItem[],
    hours: hours ?? [],
  }
}

/** Match a spoken service name to the configured list (case-insensitive, partial). */
function matchService(services: ServiceItem[], name: string | undefined) {
  if (!name) return undefined
  const n = name.trim().toLowerCase()
  return services.find((s) => s.name.toLowerCase() === n) ?? services.find((s) => s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase()))
}

async function busyOn(orgId: string, date: LocalDate, timeZone: string, excludeBookingId?: string) {
  const dayStart = zonedToUtc(date, 0, 0, timeZone)
  const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000)
  const q = createAdminClient()
    .from('bookings')
    .select('id, start_time, end_time')
    .eq('organization_id', orgId)
    .in('status', [...ACTIVE_STATUSES])
    .lt('start_time', dayEnd.toISOString())
    .gt('end_time', dayStart.toISOString())
  const [{ data }, googleBusy, excluded] = await Promise.all([
    excludeBookingId ? q.neq('id', excludeBookingId) : q,
    getBusy(orgId, dayStart, dayEnd), // [] when Google Calendar isn't connected
    excludeBookingId
      ? createAdminClient().from('bookings').select('start_time, end_time').eq('id', excludeBookingId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const own = excluded.data
  return [
    ...(data ?? []).map((b) => ({ start: new Date(b.start_time), end: new Date(b.end_time) })),
    // When rescheduling, the booking's own calendar event must not block it
    ...googleBusy.filter(
      (b) => !own || b.start.getTime() !== Date.parse(own.start_time) || b.end.getTime() !== Date.parse(own.end_time)
    ),
  ]
}

// ------------------------------------------------------------ availability

export type AvailabilityResult =
  | { ok: true; dateLabel: string; isoDate: string; slots: string[]; durationMin: number; service?: string }
  | { ok: false; reason: 'bad_date' | 'past' | 'closed' | 'full'; dateLabel?: string; openDays: string[] }

export async function getAvailability(orgId: string, dateInput: string, serviceName?: string): Promise<AvailabilityResult> {
  const { timeZone, services, hours } = await loadOrgContext(orgId)
  const openDays = hours
    .filter((h) => !h.is_closed)
    .sort((a, b) => ((a.day_of_week + 6) % 7) - ((b.day_of_week + 6) % 7))
    .map((h) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][h.day_of_week])

  const date = resolveDate(dateInput, timeZone)
  if (!date) return { ok: false, reason: 'bad_date', openDays }
  const dateLabel = formatDayLabel(date, timeZone)

  const today = todayIn(timeZone)
  if (Date.UTC(date.year, date.month - 1, date.day) < Date.UTC(today.year, today.month - 1, today.day)) {
    return { ok: false, reason: 'past', dateLabel, openDays }
  }

  const dayHours = hours.find((h) => h.day_of_week === weekdayOf(date))
  if (!dayHours || dayHours.is_closed) return { ok: false, reason: 'closed', dateLabel, openDays }

  const service = matchService(services, serviceName)
  const durationMin = service?.duration ?? DEFAULT_DURATION_MIN
  const slots = computeSlots({ date, hours: dayHours, durationMin, busy: await busyOn(orgId, date, timeZone), timeZone })
  if (!slots.length) return { ok: false, reason: 'full', dateLabel, openDays }

  return {
    ok: true,
    dateLabel,
    isoDate: `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
    slots: slots.map((s) => formatSlot(s, timeZone)),
    durationMin,
    service: service?.name,
  }
}

// ---------------------------------------------------------------- booking

export type BookingInput = {
  customerName: string
  customerPhone: string | null
  service: string | null
  date: string // anything resolveDate understands
  time: string // "HH:MM" 24h, business timezone
  notes?: string | null
}

export type BookingResult =
  | { ok: true; bookingId: string; startTime: string; dateLabel: string; time: string; service: string | null }
  | { ok: false; error: string }

/**
 * Create (or, with `rescheduleId`, move) a booking after re-checking that the
 * slot is inside opening hours and free. `allowOutsideHours` lets the owner
 * override opening hours from the dashboard; overlaps are always refused.
 */
export async function saveBooking(
  orgId: string,
  input: BookingInput,
  opts: { createdBy: 'ai' | 'human'; agentId?: string | null; callId?: string | null; rescheduleId?: string; allowOutsideHours?: boolean }
): Promise<BookingResult> {
  const { timeZone, services, hours } = await loadOrgContext(orgId)

  const date = resolveDate(input.date, timeZone)
  if (!date) return { ok: false, error: 'That date was not understood. Use a date like 2026-09-25.' }
  const t = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(input.time.trim())
  if (!t) return { ok: false, error: 'That time was not understood. Use a time like 14:30.' }

  const service = matchService(services, input.service ?? undefined)
  const durationMin = service?.duration ?? DEFAULT_DURATION_MIN
  const start = zonedToUtc(date, +t[1], +t[2], timeZone)
  const end = new Date(start.getTime() + durationMin * 60_000)
  const dateLabel = formatDayLabel(date, timeZone)

  if (start.getTime() < Date.now()) return { ok: false, error: 'That time is in the past.' }

  if (!opts.allowOutsideHours) {
    const dayHours = hours.find((h) => h.day_of_week === weekdayOf(date))
    const open = dayHours && !dayHours.is_closed && dayHours.open_time && dayHours.close_time
    const minutes = +t[1] * 60 + +t[2]
    const toMin = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3, 5)
    if (!open || minutes < toMin(dayHours!.open_time!) || minutes + durationMin > toMin(dayHours!.close_time!)) {
      return { ok: false, error: `The business is not open for a ${durationMin}-minute appointment at ${input.time} on ${dateLabel}.` }
    }
  }

  const busy = await busyOn(orgId, date, timeZone, opts.rescheduleId)
  if (busy.some((b) => start < b.end && end > b.start)) {
    return { ok: false, error: `${input.time} on ${dateLabel} is already booked.` }
  }

  const db = createAdminClient()
  const row = {
    customer_name: input.customerName.trim(),
    customer_phone: input.customerPhone?.trim() || null,
    service: service?.name ?? (input.service?.trim() || null),
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    notes: input.notes?.trim() || null,
  }

  const { data, error } = opts.rescheduleId
    ? await db
        .from('bookings')
        .update({ ...row, status: 'rescheduled' })
        .eq('id', opts.rescheduleId)
        .eq('organization_id', orgId)
        .select('id')
        .single()
    : await db
        .from('bookings')
        .insert({
          ...row,
          organization_id: orgId,
          status: 'confirmed',
          created_by: opts.createdBy,
          agent_id: opts.agentId ?? null,
          call_id: opts.callId ?? null,
        })
        .select('id')
        .single()

  if (error || !data) {
    console.error('[bookings.save]', error?.message)
    return { ok: false, error: 'The booking could not be saved.' }
  }

  await syncCalendarEvent(orgId, data.id, {
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    service: row.service,
    notes: row.notes,
    start,
    end,
    timeZone,
    createdBy: opts.createdBy,
  })

  return { ok: true, bookingId: data.id, startTime: row.start_time, dateLabel, time: formatSlot(start, timeZone), service: row.service }
}

// ------------------------------------------------------------ calendar sync

/** Create or move the booking's Google Calendar event (no-op when not connected). */
async function syncCalendarEvent(orgId: string, bookingId: string, event: Parameters<typeof createEvent>[1]) {
  const db = createAdminClient()
  const { data: booking } = await db.from('bookings').select('external_booking_id').eq('id', bookingId).single()

  if (booking?.external_booking_id) {
    await updateEvent(orgId, booking.external_booking_id, event)
    return
  }
  const eventId = await createEvent(orgId, event)
  if (eventId) {
    await db
      .from('bookings')
      .update({ external_provider: 'google_calendar', external_booking_id: eventId })
      .eq('id', bookingId)
  }
}

/** Cancel a booking and remove its calendar event. */
export async function cancelBooking(orgId: string, bookingId: string) {
  const db = createAdminClient()
  const { data, error } = await db
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('organization_id', orgId)
    .select('external_booking_id')
    .maybeSingle()
  if (error || !data) return false
  if (data.external_booking_id) await deleteEvent(orgId, data.external_booking_id)
  return true
}
