// =============================================================================
// Display formatting — always in the business's timezone (the server runs UTC)
// =============================================================================

export function formatDateTime(iso: string | null, timeZone: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTime(iso: string | null, timeZone: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })
}

export function formatDate(iso: string | null, timeZone: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

/** 95 → "1:35" */
export function formatDuration(seconds: number | null) {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Start of "today" in the given timezone, as an ISO instant. */
export function startOfTodayIso(timeZone: string) {
  const now = new Date(Math.floor(Date.now() / 1000) * 1000) // whole seconds, like the parts below
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  )
  // Wall-clock time in that zone, read as if it were UTC → offset from real UTC
  const zonedAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  const offsetMs = zonedAsUtc - now.getTime()
  const midnightZonedAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day)
  return new Date(midnightZonedAsUtc - offsetMs).toISOString()
}
