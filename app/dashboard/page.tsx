import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PhoneCall, CalendarDays, PhoneForwarded, Bot, ArrowRight, PhoneIncoming } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Overview' }

function StatCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  description?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3 neon-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

function EmptyCallsState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <PhoneCall className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm">No calls yet</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Once your AI receptionist receives its first call, your activity will appear here.
      </p>
    </div>
  )
}

function EmptyBookingsState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm">No bookings yet</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Bookings created by your AI will appear here.
      </p>
    </div>
  )
}

export default async function OverviewPage() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')

  const supabase = await createClient()
  const orgId = auth.profile.organization_id
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()

  // Fetch stats in parallel
  const [agentResult, callsTodayResult, answeredCallsResult, bookingsTodayResult, transfersResult, recentCallsResult, upcomingBookingsResult] =
    await Promise.all([
      supabase.from('ai_agents').select('id, name, status').eq('organization_id', orgId).single(),
      supabase.from('calls').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('started_at', startOfDay),
      supabase.from('calls').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'completed').gte('started_at', startOfDay),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('start_time', startOfDay),
      supabase.from('calls').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'transferred').gte('started_at', startOfDay),
      supabase.from('calls').select('id, caller_number, started_at, duration_seconds, status, purpose').eq('organization_id', orgId).order('started_at', { ascending: false }).limit(5),
      supabase.from('bookings').select('id, customer_name, customer_phone, service, start_time, status').eq('organization_id', orgId).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
    ])

  const agent = agentResult.data
  const callsToday = callsTodayResult.count ?? 0
  const answeredCalls = answeredCallsResult.count ?? 0
  const bookingsToday = bookingsTodayResult.count ?? 0
  const transfers = transfersResult.count ?? 0
  const recentCalls = recentCallsResult.data ?? []
  const upcomingBookings = upcomingBookingsResult.data ?? []

  const agentStatusColor = agent?.status === 'active' ? 'bg-neon shadow-[0_0_8px_var(--neon)]' : agent?.status === 'paused' ? 'bg-yellow-500' : 'bg-muted-foreground'

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold neon-text">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Agent status banner */}
      {agent && (
        <div className="flex items-center justify-between rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg neon-gradient neon-glow flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{agent.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-1.5 w-1.5 rounded-full ${agentStatusColor}`} />
                <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
              </div>
            </div>
          </div>
          <Link href="/dashboard/agent" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Configure
            <ArrowRight className="ml-1.5 h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Calls today" value={callsToday} icon={PhoneIncoming} />
        <StatCard label="Answered" value={answeredCalls} icon={PhoneCall} />
        <StatCard label="Bookings today" value={bookingsToday} icon={CalendarDays} />
        <StatCard label="Transfers" value={transfers} icon={PhoneForwarded} />
      </div>

      {/* Recent calls + upcoming bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent calls */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between p-5 pb-4">
            <h2 className="font-medium text-sm">Recent calls</h2>
            <Link href="/dashboard/calls" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'h-7 text-xs' })}>
              View all
            </Link>
          </div>
          <Separator />
          {recentCalls.length === 0 ? (
            <EmptyCallsState />
          ) : (
            <div className="divide-y">
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{call.caller_number ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {call.started_at ? new Date(call.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
                      {call.duration_seconds ? ` · ${Math.round(call.duration_seconds / 60)}m` : ''}
                    </p>
                  </div>
                  <Badge variant={call.status === 'completed' ? 'secondary' : call.status === 'transferred' ? 'outline' : 'destructive'} className="text-xs capitalize">
                    {call.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming bookings */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between p-5 pb-4">
            <h2 className="font-medium text-sm">Upcoming bookings</h2>
            <Link href="/dashboard/bookings" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'h-7 text-xs' })}>
              View all
            </Link>
          </div>
          <Separator />
          {upcomingBookings.length === 0 ? (
            <EmptyBookingsState />
          ) : (
            <div className="divide-y">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{booking.customer_name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.service ?? 'Appointment'} ·{' '}
                      {new Date(booking.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                      {new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {booking.status}
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
