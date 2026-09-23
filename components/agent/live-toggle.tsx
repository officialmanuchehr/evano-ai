'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Pause, Play } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { setLiveAction } from '@/lib/actions/agent'

// =============================================================================
// Go live / pause control — only meaningful once a phone number is connected
// =============================================================================
export function LiveToggle({
  status,
  phoneNumber,
}: {
  status: 'draft' | 'active' | 'paused'
  phoneNumber: string | null
}) {
  const [pending, startTransition] = useTransition()

  if (!phoneNumber) {
    return (
      <Link href="/dashboard/phone" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
        Connect a phone number
      </Link>
    )
  }

  const live = status === 'active'

  function toggle() {
    startTransition(async () => {
      const result = await setLiveAction(!live)
      if (result.success) toast.success(live ? 'Receptionist paused' : 'Receptionist is live')
      else toast.error(result.error ?? 'Something went wrong')
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-sm">
        Answering <span className="font-medium tabular-nums">{phoneNumber}</span>
      </p>
      <Button
        type="button"
        variant={live ? 'outline' : 'default'}
        className={live ? 'w-full' : 'neon-glow w-full'}
        onClick={toggle}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : live ? (
          <Pause className="mr-1.5 h-4 w-4" />
        ) : (
          <Play className="mr-1.5 h-4 w-4" />
        )}
        {live ? 'Pause receptionist' : 'Go live'}
      </Button>
    </div>
  )
}
