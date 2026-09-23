import { cn } from '@/lib/utils'

// =============================================================================
// Status / purpose badges shared by the Calls list, detail and Overview
// =============================================================================

export const CALL_STATUSES = [
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'missed', label: 'Missed' },
  { value: 'failed', label: 'Failed' },
] as const

export const CALL_PURPOSES = [
  { value: 'booking', label: 'Booking' },
  { value: 'faq', label: 'Question' },
  { value: 'cancellation', label: 'Cancellation' },
  { value: 'rescheduling', label: 'Rescheduling' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'general', label: 'General' },
  { value: 'unknown', label: 'Unknown' },
] as const

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-secondary text-secondary-foreground',
  in_progress: 'bg-neon/20 text-primary',
  transferred: 'border border-primary/40 text-primary',
  missed: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  failed: 'bg-destructive/10 text-destructive',
}

export function CallStatusBadge({ status }: { status: string }) {
  const label = CALL_STATUSES.find((s) => s.value === status)?.label ?? status
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLE[status])}>
      {status === 'in_progress' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon shadow-[0_0_6px_var(--neon)]" />}
      {label}
    </span>
  )
}

export function PurposeLabel({ purpose }: { purpose: string | null }) {
  if (!purpose) return <span className="text-muted-foreground">—</span>
  return <span>{CALL_PURPOSES.find((p) => p.value === purpose)?.label ?? purpose}</span>
}

/** Summaries end with "Follow-up needed." when Claude flagged one. */
export function needsFollowUp(summary: string | null) {
  return Boolean(summary?.endsWith('Follow-up needed.'))
}
