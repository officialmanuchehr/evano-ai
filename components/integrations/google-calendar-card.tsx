'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarDays, Check, Loader2, AlertTriangle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { disconnectGoogleCalendarAction } from '@/lib/actions/integrations'
import { cn } from '@/lib/utils'

const RESULT_MESSAGES: Record<string, [kind: 'success' | 'error', text: string]> = {
  connected: ['success', 'Google Calendar connected'],
  denied: ['error', 'Google Calendar was not connected — access was declined.'],
  invalid: ['error', 'That connection attempt expired. Please try again.'],
  error: ['error', 'Could not connect Google Calendar. Please try again.'],
}

// =============================================================================
// Google Calendar connection card
// =============================================================================
export function GoogleCalendarCard({
  status,
  email,
  result,
}: {
  status: 'connected' | 'error' | null
  email: string | null
  result: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Show the outcome of the OAuth round-trip once, then clean the URL
  useEffect(() => {
    const message = result ? RESULT_MESSAGES[result] : undefined
    if (!message) return
    if (message[0] === 'success') toast.success(message[1])
    else toast.error(message[1])
    router.replace('/dashboard/integrations')
  }, [result, router])

  function disconnect() {
    if (!confirm('Disconnect Google Calendar? Existing calendar events stay in your calendar.')) return
    startTransition(async () => {
      const res = await disconnectGoogleCalendarAction()
      if (res.success) toast.success('Google Calendar disconnected')
      else toast.error(res.error ?? 'Could not disconnect')
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
            <h2 className="font-medium">Google Calendar</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Bookings appear in your calendar, and busy times in your calendar can’t be booked.
            </p>
            {status === 'connected' && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary">
                <Check className="h-4 w-4" /> Connected{email ? ` as ${email}` : ''}
              </p>
            )}
            {status === 'error' && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" /> Access expired — reconnect to keep syncing
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {status === 'connected' ? (
            <Button type="button" variant="outline" onClick={disconnect} disabled={pending}>
              {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Disconnect
            </Button>
          ) : (
            <a href={connectHref} className={cn(buttonVariants(), 'neon-glow hover:neon-glow-strong')}>
              {status === 'error' ? 'Reconnect' : 'Connect Google Calendar'}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
