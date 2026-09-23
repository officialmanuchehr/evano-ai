'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Pause, Play } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { setLiveAction } from '@/lib/actions/agent'
import { useI18n } from '@/lib/i18n/client'

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
  const { t } = useI18n()

  if (!phoneNumber) {
    return (
      <Link href="/dashboard/phone" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
        {t.agent.connectPhone}
      </Link>
    )
  }

  const live = status === 'active'

  function toggle() {
    startTransition(async () => {
      const result = await setLiveAction(!live)
      if (result.success) toast.success(live ? t.agent.nowPaused : t.agent.nowLive)
      else toast.error(result.error ?? t.common.somethingWrong)
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-sm">
        {t.agent.answering} <span className="font-medium tabular-nums">{phoneNumber}</span>
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
        {live ? t.agent.pause : t.agent.goLive}
      </Button>
    </div>
  )
}
