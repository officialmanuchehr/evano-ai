import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Bot, CalendarDays, Plus } from 'lucide-react'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { BookingActions } from '@/components/bookings/booking-actions'
import { formatDate, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getI18n } from '@/lib/i18n/server'
import { INTL_LOCALE } from '@/lib/i18n/config'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.bookings.title }
}

const VIEWS = [{ value: 'upcoming' }, { value: 'past' }, { value: 'cancelled' }] as const
type View = (typeof VIEWS)[number]['value']

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

// =============================================================================
// Dashboard → Bookings
// =============================================================================
export default async function BookingsPage({ searchParams }: { searchParams: SearchParams }) {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')

  const { locale, t } = await getI18n()
  const bk = t.bookings
  const lang = INTL_LOCALE[locale]
  const raw = (await searchParams).view
  const view: View = VIEWS.some((v) => v.value === raw) ? (raw as View) : 'upcoming'
  const timeZone = auth.profile.organizations?.timezone ?? 'UTC'
  const nowIso = new Date().toISOString()

  const supabase = await createClient()
  let query = supabase
    .from('bookings')
    .select('id, customer_name, customer_phone, service, start_time, end_time, status, created_by, call_id, notes')
    .eq('organization_id', auth.profile.organization_id)
    .limit(100)

  if (view === 'upcoming') {
    query = query.in('status', ['confirmed', 'rescheduled']).gte('end_time', nowIso).order('start_time', { ascending: true })
  } else if (view === 'past') {
    query = query.neq('status', 'cancelled').lt('end_time', nowIso).order('start_time', { ascending: false })
  } else {
    query = query.eq('status', 'cancelled').order('start_time', { ascending: false })
  }

  const { data: bookings } = await query

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="neon-text text-2xl font-semibold">{bk.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{bk.subtitle}</p>
        </div>
        <Link href="/dashboard/bookings/new" className={cn(buttonVariants(), 'neon-glow hover:neon-glow-strong')}>
          <Plus className="h-4 w-4" /> {bk.newBooking}
        </Link>
      </div>

      {/* View tabs */}
      <nav className="inline-flex rounded-lg border p-1" aria-label={bk.viewsLabel}>
        {VIEWS.map((v) => (
          <Link
            key={v.value}
            href={v.value === 'upcoming' ? '/dashboard/bookings' : `/dashboard/bookings?view=${v.value}`}
            aria-current={view === v.value ? 'page' : undefined}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm transition-colors',
              view === v.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {bk.views[v.value]}
          </Link>
        ))}
      </nav>

      <div className="overflow-hidden rounded-xl border bg-card">
        {!bookings?.length ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium">
              {view === 'upcoming' ? bk.noneUpcoming : view === 'past' ? bk.nonePast : bk.noneCancelled}
            </p>
            {view === 'upcoming' && (
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">{bk.noneText}</p>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {bookings.map((b) => {
              const open = b.status === 'confirmed' || b.status === 'rescheduled'
              return (
                <li key={b.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[9.5rem_1fr_auto] sm:items-center sm:px-5">
                  <div>
                    <p className="text-sm font-medium">{formatDate(b.start_time, timeZone, lang).replace(/,? \d{4}( г\.)?$/, '')}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatTime(b.start_time, timeZone, lang)} – {formatTime(b.end_time, timeZone, lang)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {b.customer_name ?? t.common.unknown}
                      <span className="font-normal text-muted-foreground"> · {b.service ?? bk.appointment}</span>
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {b.customer_phone && <span className="tabular-nums">{b.customer_phone}</span>}
                      <span>{t.labels.bookingStatuses[b.status] ?? b.status}</span>
                      {b.created_by === 'ai' ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Bot className="h-3 w-3" /> {bk.bookedByAi}
                          {b.call_id && (
                            <Link href={`/dashboard/calls/${b.call_id}`} className="underline underline-offset-2">
                              {bk.viewCall}
                            </Link>
                          )}
                        </span>
                      ) : (
                        <span>{bk.addedByYou}</span>
                      )}
                    </p>
                  </div>
                  {open && <BookingActions id={b.id} upcoming={view === 'upcoming'} />}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
