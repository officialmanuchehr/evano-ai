'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { keepValues } from '@/lib/forms'
import { selectClassName } from '@/lib/onboarding/constants'
import type { ActionResult } from '@/lib/actions/auth'

export type BookingFormDefaults = {
  customerName: string
  customerPhone: string
  service: string
  date: string // YYYY-MM-DD (business timezone)
  time: string // HH:MM
  notes: string
}

// =============================================================================
// New / reschedule booking form (the server re-checks hours and overlaps)
// =============================================================================
export function BookingForm({
  action: submit,
  defaults,
  services,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<ActionResult>
  defaults: BookingFormDefaults
  services: { name: string; duration: number | null }[]
  submitLabel: string
}) {
  const [, action, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await submit(formData)
    if (!result.success && result.error) toast.error(result.error)
    return result
  }, null)

  // Keep a custom (non-listed) service selectable when editing
  const serviceOptions = services.some((s) => s.name === defaults.service) || !defaults.service
    ? services
    : [...services, { name: defaults.service, duration: null }]

  return (
    <form onSubmit={keepValues(action)} className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer name</Label>
          <Input id="customerName" name="customerName" defaultValue={defaults.customerName} required disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Phone</Label>
          <Input id="customerPhone" name="customerPhone" type="tel" defaultValue={defaults.customerPhone} disabled={pending} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="service">Service</Label>
        <select id="service" name="service" defaultValue={defaults.service} disabled={pending} className={selectClassName}>
          <option value="">General appointment (30 min)</option>
          {serviceOptions.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
              {s.duration ? ` (${s.duration} min)` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={defaults.date} required disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Time</Label>
          <Input id="time" name="time" type="time" step={300} defaultValue={defaults.time} required disabled={pending} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaults.notes} disabled={pending} />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="allowOutsideHours" className="h-4 w-4 accent-[var(--primary)]" disabled={pending} />
        Allow booking outside opening hours
      </label>

      <div className="flex justify-end gap-2 border-t pt-5">
        <Link href="/dashboard/bookings" className={buttonVariants({ variant: 'ghost' })}>
          Cancel
        </Link>
        <Button type="submit" className="neon-glow hover:neon-glow-strong px-5" disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
