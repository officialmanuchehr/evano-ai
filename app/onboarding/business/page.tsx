import { redirect } from 'next/navigation'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { StepCard } from '@/components/onboarding/step-card'
import { getI18n } from '@/lib/i18n/server'
import { BusinessForm } from '@/components/onboarding/business-form'

// =============================================================================
// Onboarding step 1 — Business details
// =============================================================================
export default async function OnboardingBusinessPage() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  const { t } = await getI18n()

  const supabase = await createClient()
  const { data: info } = await supabase
    .from('business_info')
    .select('phone, email, website, address, description')
    .eq('organization_id', auth.profile.organization_id)
    .maybeSingle()

  const org = auth.profile.organizations

  return (
    <StepCard title={t.onboarding.business.title} description={t.onboarding.business.description}>
      <BusinessForm
        defaults={{
          name: org?.name ?? '',
          industry: org?.industry ?? null,
          timezone: org?.timezone ?? 'UTC',
          phone: info?.phone ?? null,
          // Prefill contact email with the owner's login email on first visit
          email: info?.email ?? auth.profile.email,
          website: info?.website ?? null,
          address: info?.address ?? null,
          description: info?.description ?? null,
        }}
      />
    </StepCard>
  )
}
