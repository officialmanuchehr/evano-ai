import { redirect } from 'next/navigation'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { StepCard } from '@/components/onboarding/step-card'
import { getI18n } from '@/lib/i18n/server'
import { HoursForm, type DayHours } from '@/components/onboarding/hours-form'

// =============================================================================
// Onboarding step 2 — Business hours
// =============================================================================
export default async function OnboardingHoursPage() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  const { t } = await getI18n()

  const orgId = auth.profile.organization_id
  const supabase = await createClient()

  const [{ data: rows }, { data: info }] = await Promise.all([
    supabase
      .from('business_hours')
      .select('day_of_week, is_closed, open_time, close_time')
      .eq('organization_id', orgId),
    supabase
      .from('business_info')
      .select('after_hours_behavior, transfer_number')
      .eq('organization_id', orgId)
      .maybeSingle(),
  ])

  // One entry per weekday; fall back to Mon–Fri 9–17 if a row is missing.
  // DB TIME values look like "09:00:00" — <input type="time"> wants "09:00".
  const initialHours: DayHours[] = [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const row = rows?.find((r) => r.day_of_week === day)
    const weekend = day === 0 || day === 6
    return {
      day,
      isClosed: row ? row.is_closed : weekend,
      open: row?.open_time?.slice(0, 5) ?? '09:00',
      close: row?.close_time?.slice(0, 5) ?? '17:00',
    }
  })

  return (
    <StepCard title={t.onboarding.hours.title} description={t.onboarding.hours.description}>
      <HoursForm
        initialHours={initialHours}
        initialAfterHours={info?.after_hours_behavior ?? 'ai'}
        initialTransferNumber={info?.transfer_number ?? ''}
      />
    </StepCard>
  )
}
