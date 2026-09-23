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
import { useI18n } from '@/lib/i18n/client'

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
export function BusinessForm({
  defaults,
  action: submit = saveBusinessAction,
  submitLabel,
  successMessage,
}: {
  defaults: BusinessFormDefaults
  /** Defaults to the onboarding step; Settings passes its own action */
  action?: (formData: FormData) => Promise<{ success: boolean; error?: string; warning?: string }>
  submitLabel?: string
  successMessage?: string
}) {
  const timezoneRef = useRef<HTMLSelectElement>(null)
  const { t } = useI18n()
  const b = t.onboarding.business

  const [, action, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await submit(formData)
    if (!result.success && result.error) toast.error(result.error)
    else if (result.success && result.warning) toast.warning(result.warning)
    else if (result.success && successMessage) toast.success(successMessage)
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
        <Label htmlFor="name">{b.name}</Label>
        <Input id="name" name="name" defaultValue={defaults.name} required disabled={pending} />
        <FieldHint>{b.nameHint}</FieldHint>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="industry">{b.industry}</Label>
          <select
            id="industry"
            name="industry"
            defaultValue={defaults.industry ?? ''}
            required
            disabled={pending}
            className={selectClassName}
          >
            <option value="" disabled>
              {b.choose}
            </option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {t.labels.industries[i] ?? i}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">{b.timezone}</Label>
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
          <Label htmlFor="phone">{b.phone}</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+992 90 000 0000" defaultValue={defaults.phone ?? ''} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{b.email}</Label>
          <Input id="email" name="email" type="email" placeholder="hello@yourbusiness.com" defaultValue={defaults.email ?? ''} disabled={pending} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="website">{b.website}</Label>
          <Input id="website" name="website" placeholder="yourbusiness.com" defaultValue={defaults.website ?? ''} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">{b.address}</Label>
          <Input id="address" name="address" placeholder={b.addressPlaceholder} defaultValue={defaults.address ?? ''} disabled={pending} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{b.about}</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder={b.aboutPlaceholder}
          defaultValue={defaults.description ?? ''}
          disabled={pending}
        />
        <FieldHint>{b.aboutHint}</FieldHint>
      </div>

      <StepActions pending={pending} submitLabel={submitLabel} />
    </form>
  )
}
