'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StepActions, FieldHint } from '@/components/onboarding/step-card'
import { saveBusinessAction } from '@/lib/actions/onboarding'
import { INDUSTRIES, TIMEZONES, selectClassName } from '@/lib/onboarding/constants'
import { keepValues } from '@/lib/forms'

export type BusinessFormDefaults = {
  name: string
  industry: string | null
  timezone: string
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  description: string | null
}

// =============================================================================
// Step 1 form — business identity and contact details
// =============================================================================
export function BusinessForm({ defaults }: { defaults: BusinessFormDefaults }) {
  const timezoneRef = useRef<HTMLSelectElement>(null)

  const [, action, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await saveBusinessAction(formData)
    if (!result.success && result.error) toast.error(result.error)
    return result
  }, null)

  // New orgs start on UTC — preselect the browser's timezone when we know it
  useEffect(() => {
    if (defaults.timezone !== 'UTC' || !timezoneRef.current) return
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if ((TIMEZONES as readonly string[]).includes(browserTz)) {
      timezoneRef.current.value = browserTz
    }
  }, [defaults.timezone])

  return (
    <form onSubmit={keepValues(action)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Business name</Label>
        <Input id="name" name="name" defaultValue={defaults.name} required disabled={pending} />
        <FieldHint>Your receptionist greets callers with this name.</FieldHint>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <select
            id="industry"
            name="industry"
            defaultValue={defaults.industry ?? ''}
            required
            disabled={pending}
            className={selectClassName}
          >
            <option value="" disabled>
              Choose…
            </option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            name="timezone"
            ref={timezoneRef}
            defaultValue={defaults.timezone}
            required
            disabled={pending}
            className={selectClassName}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Business phone</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+992 90 000 0000" defaultValue={defaults.phone ?? ''} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Contact email</Label>
          <Input id="email" name="email" type="email" placeholder="hello@yourbusiness.com" defaultValue={defaults.email ?? ''} disabled={pending} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" placeholder="yourbusiness.com" defaultValue={defaults.website ?? ''} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" placeholder="Street, city" defaultValue={defaults.address ?? ''} disabled={pending} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">What does your business do?</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="e.g. Family dental clinic offering check-ups, cleaning and whitening."
          defaultValue={defaults.description ?? ''}
          disabled={pending}
        />
        <FieldHint>A sentence or two — the AI uses this to describe you to callers.</FieldHint>
      </div>

      <StepActions pending={pending} />
    </form>
  )
}
