import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PhoneCall, CalendarDays, PhoneForwarded, Bot, ArrowRight, PhoneIncoming } from 'lucide-react'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CallStatusBadge } from '@/components/calls/call-badges'
import { formatDateTime, formatDuration, startOfTodayIso } from '@/lib/format'
import { getI18n } from '@/lib/i18n/server'
import { INTL_LOCALE } from '@/lib/i18n/config'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.overview.title }
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="neon-card space-y-3 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}

function EmptyState({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

// =============================================================================
// Dashboard → Overview
// =============================================================================
export default async function OverviewPage() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  const { locale, t } = await getI18n()
  const o = t.overview
  const lang = INTL_LOCALE[locale]

  const supabase = await createClient()
  const orgId = auth.profile.organization_id
  // "Today" means today in the business's timezone, not the server's (UTC)
  const timeZone = auth.profile.organizations?.timezone ?? 'UTC'
  const today = new Date()
  const startOfDay = startOfTodayIso(timeZone)

  // Fetch stats in parallel
  const [agentResult, callsTodayResult, answeredCallsResult, bookingsTodayResult, transfersResult, recentCallsResult, upcomingBookingsResult] =
    await Promise.all([
      supabase.from('ai_agents').select('id, name, status').eq('organization_id', orgId).single(),
      supabase.from('calls').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('started_at', startOfDay),
      supabase.from('calls').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'completed').gte('started_at', startOfDay),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('start_time', startOfDay),
      supabase.from('calls').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'transferred').gte('started_at', startOfDay),
      supabase.from('calls').select('id, caller_number, started_at, created_at, duration_seconds, status, purpose').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
      supabase.from('bookings').select('id, customer_name, customer_phone, service, start_time, status').eq('organization_id', orgId).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
    ])

  const agent = agentResult.data
  const recentCalls = recentCallsResult.data ?? []
  const upcomingBookings = upcomingBookingsResult.data ?? []

  const agentStatusColor =
    agent?.status === 'active' ? 'bg-neon shadow-[0_0_8px_var(--neon)]' : agent?.status === 'paused' ? 'bg-yellow-500' : 'bg-muted-foreground'

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="neon-text text-2xl font-semibold">{o.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
          {today.toLocaleDateString(lang, { timeZone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Agent status banner */}
      {agent && (
        <div className="flex items-center justify-between rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="neon-gradient neon-glow flex h-9 w-9 items-center justify-center rounded-lg">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{agent.name}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${agentStatusColor}`} />
                <span className="text-xs text-muted-foreground">{t.labels.agentStatuses[agent.status] ?? agent.status}</span>
              </div>
            </div>
          </div>
          <Link href="/dashboard/agent" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            {o.configure}
            <ArrowRight className="ml-1.5 h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={o.callsToday} value={callsTodayResult.count ?? 0} icon={PhoneIncoming} />
        <StatCard label={o.answered} value={answeredCallsResult.count ?? 0} icon={PhoneCall} />
        <StatCard label={o.bookingsToday} value={bookingsTodayResult.count ?? 0} icon={CalendarDays} />
        <StatCard label={o.transfers} value={transfersResult.count ?? 0} icon={PhoneForwarded} />
      </div>

      {/* Recent calls + upcoming bookings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent calls */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between p-5 pb-4">
            <h2 className="text-sm font-medium">{o.recentCalls}</h2>
            <Link href="/dashboard/calls" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'h-7 text-xs' })}>
              {t.common.viewAll}
            </Link>
          </div>
          <Separator />
          {recentCalls.length === 0 ? (
            <EmptyState icon={PhoneCall} title={o.noCalls} text={o.noCallsText} />
          ) : (
            <div className="divide-y">
              {recentCalls.map((call) => (
                <Link
                  key={call.id}
                  href={`/dashboard/calls/${call.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/60"
                >
                  <div>
                    <p className="text-sm font-medium tabular-nums">{call.caller_number ?? t.common.unknown}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(call.started_at ?? call.created_at, timeZone, lang)} · {formatDuration(call.duration_seconds)}
                    </p>
                  </div>
                  <CallStatusBadge status={call.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming bookings */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between p-5 pb-4">
            <h2 className="text-sm font-medium">{o.upcomingBookings}</h2>
            <Link href="/dashboard/bookings" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'h-7 text-xs' })}>
              {t.common.viewAll}
            </Link>
          </div>
          <Separator />
          {upcomingBookings.length === 0 ? (
            <EmptyState icon={CalendarDays} title={o.noBookings} text={o.noBookingsText} />
          ) : (
            <div className="divide-y">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{booking.customer_name ?? t.common.unknown}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.service ?? o.appointment} · {formatDateTime(booking.start_time, timeZone, lang)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {t.labels.bookingStatuses[booking.status] ?? booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
