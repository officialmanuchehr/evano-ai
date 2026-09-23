'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { setBookingStatusAction } from '@/lib/actions/bookings'

// =============================================================================
// Row actions: reschedule / cancel for upcoming, completed / no-show for past
// =============================================================================
export function BookingActions({ id, upcoming }: { id: string; upcoming: boolean }) {
  const [pending, startTransition] = useTransition()

  function set(status: 'cancelled' | 'completed' | 'no_show', message: string) {
    if (status === 'cancelled' && !confirm('Cancel this booking?')) return
    startTransition(async () => {
      const result = await setBookingStatusAction(id, status)
      if (result.success) toast.success(message)
      else toast.error(result.error ?? 'Something went wrong')
    })
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {upcoming ? (
        <>
          <Link href={`/dashboard/bookings/${id}/edit`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Reschedule
          </Link>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => set('cancelled', 'Booking cancelled')}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => set('completed', 'Marked as completed')}>
            Completed
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => set('no_show', 'Marked as no-show')}>
            No-show
          </Button>
        </>
      )}
    </div>
  )
}
