'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { setBookingStatusAction } from '@/lib/actions/bookings'
import { useI18n } from '@/lib/i18n/client'

// =============================================================================
// Row actions: reschedule / cancel for upcoming, completed / no-show for past
// =============================================================================
export function BookingActions({ id, upcoming }: { id: string; upcoming: boolean }) {
  const [pending, startTransition] = useTransition()
  const { t } = useI18n()
  const b = t.bookings

  function set(status: 'cancelled' | 'completed' | 'no_show', message: string) {
    if (status === 'cancelled' && !confirm(b.cancelConfirm)) return
    startTransition(async () => {
      const result = await setBookingStatusAction(id, status)
      if (result.success) toast.success(message)
      else toast.error(result.error ?? t.common.somethingWrong)
    })
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {upcoming ? (
        <>
          <Link href={`/dashboard/bookings/${id}/edit`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            {b.reschedule}
          </Link>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => set('cancelled', b.cancelled)}>
            {b.cancel}
          </Button>
        </>
      ) : (
        <>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => set('completed', b.markedCompleted)}>
            {b.completed}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => set('no_show', b.markedNoShow)}>
            {b.noShow}
          </Button>
        </>
      )}
    </div>
  )
}
