// =============================================================================
// Booking availability — pure functions (no DB), timezone-correct.
// All "wall clock" values are in the business's timezone; instants are UTC.
// =============================================================================

export type LocalDate = { year: number; month: number; day: number } // month 1–12

export type DayHours = { is_closed: boolean; open_time: string | null; close_time: string | null }

export type Busy = { start: Date; end: Date }

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

/** Wall-clock parts of an instant in a timezone (weekday 0 = Sunday). */
export function zonedParts(instant: Date, timeZone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map((x) => [x.type, x.value])
  )
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: +p.hour,
    minute: +p.minute,
    second: +p.second,
    weekday: WEEKDAYS.indexOf(String(p.weekday).toLowerCase() as (typeof WEEKDAYS)[number]),
  }
}

/** Offset of `timeZone` from UTC at `instant`, in ms (e.g. +5h for Asia/Dushanbe). */
function offsetMs(instant: Date, timeZone: string) {
  const whole = new Date(Math.floor(instant.getTime() / 1000) * 1000)
  const p = zonedParts(whole, timeZone)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - whole.getTime()
}

/** Wall-clock time in `timeZone` → UTC instant (DST-safe: offset re-checked at the result). */
export function zonedToUtc(date: LocalDate, hour: number, minute: number, timeZone: string): Date {
  const naive = Date.UTC(date.year, date.month - 1, date.day, hour, minute)
  let result = naive - offsetMs(new Date(naive), timeZone)
  result = naive - offsetMs(new Date(result), timeZone)
  return new Date(result)
}

export function weekdayOf(date: LocalDate) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
}

function addDays(date: LocalDate, days: number): LocalDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

export function todayIn(timeZone: string, now = new Date()): LocalDate {
  const p = zonedParts(now, timeZone)
  return { year: p.year, month: p.month, day: p.day }
}

export function toIsoDate(d: LocalDate) {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

/**
 * Understand what a caller (or the AI) said: "today", "tomorrow", a weekday
 * ("friday" → the next Friday, today included) or an ISO date "2026-09-25".
 */
export function resolveDate(input: string, timeZone: string, now = new Date()): LocalDate | null {
  const text = input.trim().toLowerCase()
  const today = todayIn(timeZone, now)
  if (text === 'today') return today
  if (text === 'tomorrow') return addDays(today, 1)

  const weekday = WEEKDAYS.findIndex((w) => text === w || text === `next ${w}` || text === `this ${w}`)
  if (weekday >= 0) {
    const diff = (weekday - weekdayOf(today) + 7) % 7
    return addDays(today, text.startsWith('next ') && diff === 0 ? 7 : diff)
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (iso) {
    const d = { year: +iso[1], month: +iso[2], day: +iso[3] }
    const check = new Date(Date.UTC(d.year, d.month - 1, d.day))
    if (check.getUTCMonth() + 1 !== d.month || check.getUTCDate() !== d.day) return null // e.g. Feb 30
    return d
  }
  return null
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Free start times on `date` for an appointment of `durationMin`, on a
 * `stepMin` grid, inside opening hours, not overlapping `busy`, and at least
 * `leadMin` minutes from now.
 */
export function computeSlots(opts: {
  date: LocalDate
  hours: DayHours | undefined
  durationMin: number
  busy: Busy[]
  timeZone: string
  now?: Date
  stepMin?: number
  leadMin?: number
}): Date[] {
  const { date, hours, durationMin, busy, timeZone, now = new Date(), stepMin = 30, leadMin = 30 } = opts
  if (!hours || hours.is_closed || !hours.open_time || !hours.close_time) return []

  const open = toMinutes(hours.open_time)
  const close = toMinutes(hours.close_time)
  const earliest = now.getTime() + leadMin * 60_000
  const slots: Date[] = []

  for (let m = open; m + durationMin <= close; m += stepMin) {
    const start = zonedToUtc(date, Math.floor(m / 60), m % 60, timeZone)
    const end = new Date(start.getTime() + durationMin * 60_000)
    if (start.getTime() < earliest) continue
    if (busy.some((b) => start < b.end && end > b.start)) continue
    slots.push(start)
  }
  return slots
}

/** "Friday, 25 September" in the business timezone (`lang` for the dashboard's language). */
export function formatDayLabel(date: LocalDate, timeZone: string, lang = 'en-GB') {
  return zonedToUtc(date, 12, 0, timeZone).toLocaleDateString(lang, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** "9:30" (24-hour) in the business timezone — easy for the voice AI to read out. */
export function formatSlot(instant: Date, timeZone: string) {
  const p = zonedParts(instant, timeZone)
  return `${p.hour}:${String(p.minute).padStart(2, '0')}`
}
