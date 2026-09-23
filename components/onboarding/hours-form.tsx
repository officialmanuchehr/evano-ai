'use client'

import { useActionState, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StepActions } from '@/components/onboarding/step-card'
import { saveHoursAction } from '@/lib/actions/onboarding'
import { WEEK_DAYS, AFTER_HOURS_OPTIONS } from '@/lib/onboarding/constants'
import { keepValues } from '@/lib/forms'

export type DayHours = { day: number; isClosed: boolean; open: string; close: string }
type AfterHours = (typeof AFTER_HOURS_OPTIONS)[number]['value']

// =============================================================================
// Step 2 form — weekly schedule + what happens to after-hours calls
// =============================================================================
export function HoursForm({
  initialHours,
  initialAfterHours,
  initialTransferNumber,
}: {
  initialHours: DayHours[]
  initialAfterHours: AfterHours
  initialTransferNumber: string
}) {
  const [hours, setHours] = useState(initialHours)
  const [afterHours, setAfterHours] = useState<AfterHours>(initialAfterHours)

  const [, action, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await saveHoursAction(formData)
    if (!result.success && result.error) toast.error(result.error)
    return result
  }, null)

  function toggleClosed(day: number, isClosed: boolean) {
    setHours((prev) => prev.map((h) => (h.day === day ? { ...h, isClosed } : h)))
  }

  return (
    <form onSubmit={keepValues(action)} className="space-y-8">
      {/* Weekly schedule */}
      <fieldset className="space-y-2" disabled={pending}>
        <legend className="mb-3 text-sm font-medium">Opening hours</legend>
        {WEEK_DAYS.map(({ day, label }) => {
          const h = hours.find((x) => x.day === day)!
          return (
            <div
              key={day}
              className={cn(
                'grid grid-cols-[6.5rem_1fr] items-center gap-3 rounded-lg border px-3 py-2 sm:grid-cols-[8rem_auto_1fr]',
                h.isClosed && 'bg-muted/60'
              )}
            >
              <span className="text-sm font-medium">{label}</span>

              <label className="flex items-center gap-2 text-sm text-muted-foreground sm:order-last sm:justify-self-end">
                <input
                  type="checkbox"
                  name={`day-${day}-closed`}
                  checked={h.isClosed}
                  onChange={(e) => toggleClosed(day, e.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                  aria-label={`${label} closed`}
                />
                Closed
              </label>

              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <Input
                  type="time"
                  name={`day-${day}-open`}
                  defaultValue={h.open}
                  disabled={h.isClosed}
                  aria-label={`${label} opens`}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="time"
                  name={`day-${day}-close`}
                  defaultValue={h.close}
                  disabled={h.isClosed}
                  aria-label={`${label} closes`}
                  className="w-32"
                />
              </div>
            </div>
          )
        })}
      </fieldset>

      {/* After-hours behavior */}
      <fieldset className="space-y-3" disabled={pending}>
        <legend className="mb-3 text-sm font-medium">When someone calls after hours</legend>
        {AFTER_HOURS_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
              afterHours === opt.value ? 'border-primary bg-secondary' : 'hover:bg-muted'
            )}
          >
            <input
              type="radio"
              name="after_hours_behavior"
              value={opt.value}
              checked={afterHours === opt.value}
              onChange={() => setAfterHours(opt.value)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            {opt.label}
          </label>
        ))}

        {afterHours === 'transfer' && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="transfer_number">Forward calls to</Label>
            <Input
              id="transfer_number"
              name="transfer_number"
              type="tel"
              placeholder="+992 90 000 0000"
              defaultValue={initialTransferNumber}
              required
            />
          </div>
        )}
      </fieldset>

      <StepActions backHref="/onboarding/business" pending={pending} />
    </form>
  )
}
