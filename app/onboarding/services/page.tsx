import { redirect } from 'next/navigation'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { StepCard } from '@/components/onboarding/step-card'
import { getI18n } from '@/lib/i18n/server'
import { ServicesForm } from '@/components/onboarding/services-form'
import type { FaqItem, ServiceItem } from '@/lib/onboarding/constants'

// =============================================================================
// Onboarding step 3 — Services & FAQs (last step)
// =============================================================================
export default async function OnboardingServicesPage() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  const { t } = await getI18n()

  const orgId = auth.profile.organization_id
  const supabase = await createClient()

  const [{ data: info }, { data: faqs }] = await Promise.all([
    supabase.from('business_info').select('services').eq('organization_id', orgId).maybeSingle(),
    supabase
      .from('faqs')
      .select('question, answer')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true }),
  ])

  const services = Array.isArray(info?.services) ? (info.services as ServiceItem[]) : []

  return (
    <StepCard title={t.onboarding.services.title} description={t.onboarding.services.description}>
      <ServicesForm initialServices={services} initialFaqs={(faqs ?? []) as FaqItem[]} />
    </StepCard>
  )
}
