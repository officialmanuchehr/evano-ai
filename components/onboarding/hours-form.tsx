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
import { interpolate } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/client'

export type DayHours = { day: number; isClosed: boolean; open: string; close: string }
type AfterHours = (typeof AFTER_HOURS_OPTIONS)[number]['value']

// =============================================================================
// Step 2 form — weekly schedule + what happens to after-hours calls
// =============================================================================
export function HoursForm({
  initialHours,
  initialAfterHours,
  initialTransferNumber,
  action: submit = saveHoursAction,
  backHref = '/onboarding/business',
  submitLabel,
  successMessage,
}: {
  initialHours: DayHours[]
  initialAfterHours: AfterHours
  initialTransferNumber: string
  /** Defaults to the onboarding step; Settings passes its own action */
  action?: (formData: FormData) => Promise<{ success: boolean; error?: string; warning?: string }>
  backHref?: string | null
  submitLabel?: string
  successMessage?: string
}) {
  const { t } = useI18n()
  const o = t.onboarding.hours
  const [hours, setHours] = useState(initialHours)
  const [afterHours, setAfterHours] = useState<AfterHours>(initialAfterHours)

  const [, action, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await submit(formData)
    if (!result.success && result.error) toast.error(result.error)
    else if (result.success && result.warning) toast.warning(result.warning)
    else if (result.success && successMessage) toast.success(successMessage)
    return result
  }, null)

  function toggleClosed(day: number, isClosed: boolean) {
    setHours((prev) => prev.map((h) => (h.day === day ? { ...h, isClosed } : h)))
  }

  return (
    <form onSubmit={keepValues(action)} className="space-y-8">
      {/* Weekly schedule */}
      <fieldset className="space-y-2" disabled={pending}>
        <legend className="mb-3 text-sm font-medium">{o.openingHours}</legend>
        {WEEK_DAYS.map(({ day }) => {
          const label = t.labels.weekdays[day]
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
                  aria-label={interpolate(o.closedLabel, { day: label })}
                />
                {o.closed}
              </label>

              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <Input
                  type="time"
                  name={`day-${day}-open`}
                  defaultValue={h.open}
                  disabled={h.isClosed}
                  aria-label={interpolate(o.opens, { day: label })}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">{o.to}</span>
                <Input
                  type="time"
                  name={`day-${day}-close`}
                  defaultValue={h.close}
                  disabled={h.isClosed}
                  aria-label={interpolate(o.closes, { day: label })}
                  className="w-32"
                />
              </div>
            </div>
          )
        })}
      </fieldset>

      {/* After-hours behavior */}
      <fieldset className="space-y-3" disabled={pending}>
        <legend className="mb-3 text-sm font-medium">{o.afterHours}</legend>
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
            {t.labels.afterHours[opt.value]}
          </label>
        ))}

        {afterHours === 'transfer' && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="transfer_number">{o.forwardTo}</Label>
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

      <StepActions backHref={backHref ?? undefined} pending={pending} submitLabel={submitLabel} />
    </form>
  )
}
