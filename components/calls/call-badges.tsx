'use client'

import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/client'

// =============================================================================
// Status / purpose badges shared by the Calls list, detail and Overview.
// Values match public.calls; labels come from the current language.
// =============================================================================

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-secondary text-secondary-foreground',
  in_progress: 'bg-neon/20 text-primary',
  transferred: 'border border-primary/40 text-primary',
  missed: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  failed: 'bg-destructive/10 text-destructive',
}

export function CallStatusBadge({ status }: { status: string }) {
  const { t } = useI18n()
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLE[status])}>
      {status === 'in_progress' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon shadow-[0_0_6px_var(--neon)]" />}
      {t.labels.callStatuses[status] ?? status}
    </span>
  )
}

export function PurposeLabel({ purpose }: { purpose: string | null }) {
  const { t } = useI18n()
  if (!purpose) return <span className="text-muted-foreground">—</span>
  return <span>{t.labels.callPurposes[purpose] ?? purpose}</span>
}
