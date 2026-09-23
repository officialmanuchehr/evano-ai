import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ChevronLeft, ChevronRight, PhoneCall, Search, Flag } from 'lucide-react'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { CallStatusBadge, PurposeLabel } from '@/components/calls/call-badges'
import { CALL_PURPOSES, CALL_STATUSES, needsFollowUp } from '@/lib/calls/constants'
import { selectClassName } from '@/lib/onboarding/constants'
import { formatDateTime, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getI18n } from '@/lib/i18n/server'
import { INTL_LOCALE, interpolate } from '@/lib/i18n/config'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.calls.title }
}

const PAGE_SIZE = 20

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

// =============================================================================
// Dashboard → Calls
// =============================================================================
export default async function CallsPage({ searchParams }: { searchParams: SearchParams }) {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')

  const { locale, t } = await getI18n()
  const c = t.calls
  const lang = INTL_LOCALE[locale]
  const sp = await searchParams
  const status = (CALL_STATUSES as readonly string[]).includes(one(sp.status)) ? one(sp.status) : ''
  const purpose = (CALL_PURPOSES as readonly string[]).includes(one(sp.purpose)) ? one(sp.purpose) : ''
  // Strip characters that have meaning inside a PostgREST filter string
  const q = one(sp.q).replace(/[%,()*\\]/g, '').trim().slice(0, 60)
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1)

  const timeZone = auth.profile.organizations?.timezone ?? 'UTC'
  const supabase = await createClient()

  let query = supabase
    .from('calls')
    .select('id, caller_number, started_at, created_at, duration_seconds, status, purpose, summary', { count: 'exact' })
    .eq('organization_id', auth.profile.organization_id)
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (status) query = query.eq('status', status as never)
  if (purpose) query = query.eq('purpose', purpose as never)
  if (q) query = query.or(`caller_number.ilike.%${q}%,summary.ilike.%${q}%`)

  const { data: calls, count } = await query
  const total = count ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filtered = Boolean(status || purpose || q)

  const pageHref = (p: number) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (purpose) params.set('purpose', purpose)
    if (q) params.set('q', q)
    if (p > 1) params.set('page', String(p))
    const s = params.toString()
    return `/dashboard/calls${s ? `?${s}` : ''}`
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="neon-text text-2xl font-semibold">{c.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{c.subtitle}</p>
      </div>

      {/* Filters — a plain GET form, so they live in the URL */}
      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder={c.search} aria-label={c.searchLabel} className="pl-8" />
        </div>
        <select name="status" defaultValue={status} aria-label={c.statusLabel} className={cn(selectClassName, 'sm:w-40')}>
          <option value="">{c.allStatuses}</option>
          {CALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.labels.callStatuses[s]}
            </option>
          ))}
        </select>
        <select name="purpose" defaultValue={purpose} aria-label={c.reasonLabel} className={cn(selectClassName, 'sm:w-40')}>
          <option value="">{c.allReasons}</option>
          {CALL_PURPOSES.map((p) => (
            <option key={p} value={p}>
              {t.labels.callPurposes[p]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          {c.filter}
        </Button>
        {filtered && (
          <Link href="/dashboard/calls" className={buttonVariants({ variant: 'ghost' })}>
            {c.clear}
          </Link>
        )}
      </form>

      {/* List */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {!calls?.length ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <PhoneCall className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium">{filtered ? c.noMatch : c.none}</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              {filtered ? c.noMatchText : c.noneText}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {calls.map((call) => (
              <li key={call.id}>
                <Link
                  href={`/dashboard/calls/${call.id}`}
                  className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/60 sm:grid-cols-[11rem_1fr_auto] sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium tabular-nums">{call.caller_number ?? t.common.unknownCaller}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(call.started_at ?? call.created_at, timeZone, lang)} · {formatDuration(call.duration_seconds)}
                    </p>
                  </div>
                  <p className="col-span-2 row-start-2 line-clamp-2 text-sm text-muted-foreground sm:col-span-1 sm:col-start-2 sm:row-start-1">
                    {needsFollowUp(call.summary) && (
                      <Flag className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-primary" aria-label={c.followUp} />
                    )}
                    {call.summary ?? (call.status === 'in_progress' ? c.inProgress : c.noSummary)}
                  </p>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    <CallStatusBadge status={call.status} />
                    <span className="text-muted-foreground">
                      <PurposeLabel purpose={call.purpose} />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <nav className="flex items-center justify-between text-sm" aria-label={c.pagination}>
          <span className="text-muted-foreground">
            {interpolate(c.range, { from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, total), total })}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <ChevronLeft className="h-4 w-4" /> {c.previous}
              </Link>
            )}
            {page < pages && (
              <Link href={pageHref(page + 1)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                {c.next} <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
