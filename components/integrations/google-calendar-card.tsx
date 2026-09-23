'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarDays, Check, Loader2, AlertTriangle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { disconnectGoogleCalendarAction, syncGoogleCalendarAction } from '@/lib/actions/integrations'
import { cn } from '@/lib/utils'
import { interpolate } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/client'

// =============================================================================
// Google Calendar connection card
// =============================================================================
export function GoogleCalendarCard({
  status,
  email,
  result,
  lastError,
}: {
  status: 'connected' | 'error' | null
  email: string | null
  result: string | null
  lastError?: string | null
}) {
  const router = useRouter()
  const { t } = useI18n()
  const g = t.integrations
  const [pending, startTransition] = useTransition()

  // Show the outcome of the OAuth round-trip once, then clean the URL
  useEffect(() => {
    const message = result ? g.results[result] : undefined
    if (!message) return
    if (result === 'connected') toast.success(message)
    else toast.error(message)
    router.replace('/dashboard/integrations')
  }, [result, router, g.results])

  function disconnect() {
    if (!confirm(g.disconnectConfirm)) return
    startTransition(async () => {
      const res = await disconnectGoogleCalendarAction()
      if (res.success) toast.success(g.disconnected)
      else toast.error(res.error ?? t.errors.googleDisconnectFailed)
    })
  }

  function syncNow() {
    startTransition(async () => {
      const res = await syncGoogleCalendarAction()
      if (res.success) toast.success(interpolate(g.synced, { count: res.created ?? 0 }))
      else toast.error(res.error ?? t.common.somethingWrong)
      router.refresh()
    })
  }

  // Full-page navigation: the connect route redirects to Google
  const connectHref = '/api/integrations/google-calendar/connect'

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
            <CalendarDays className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h2 className="font-medium">{g.google}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{g.googleText}</p>
            {status === 'connected' && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-success">
                <Check className="h-4 w-4" /> {email ? interpolate(g.connectedAs, { email }) : g.connected}
              </p>
            )}
            {status === 'connected' && lastError && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {g.syncFailed} <span className="break-words text-muted-foreground">{lastError}</span>
                </span>
              </p>
            )}
            {status === 'error' && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" /> {g.expired}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {status === 'connected' ? (
            <>
              <Button type="button" variant="outline" onClick={syncNow} disabled={pending}>
                {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {g.syncNow}
              </Button>
              <Button type="button" variant="ghost" onClick={disconnect} disabled={pending}>
                {g.disconnect}
              </Button>
            </>
          ) : (
            <a href={connectHref} className={cn(buttonVariants(), 'neon-glow hover:neon-glow-strong')}>
              {status === 'error' ? g.reconnect : g.connect}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
