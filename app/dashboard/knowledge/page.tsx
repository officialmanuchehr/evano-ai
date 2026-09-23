import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { FaqsEditor, ServicesEditor, type FaqRow } from '@/components/knowledge/knowledge-editors'
import { getI18n } from '@/lib/i18n/server'
import type { ServiceItem } from '@/lib/onboarding/constants'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.knowledge.title }
}

// =============================================================================
// Dashboard → Knowledge (services + FAQs the receptionist answers from)
// =============================================================================
export default async function KnowledgePage() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  const { t } = await getI18n()

  const orgId = auth.profile.organization_id
  const supabase = await createClient()
  const [{ data: info }, { data: faqs }] = await Promise.all([
    supabase.from('business_info').select('services').eq('organization_id', orgId).maybeSingle(),
    supabase.from('faqs').select('question, answer, is_active').eq('organization_id', orgId).order('created_at', { ascending: true }),
  ])

  const services = (Array.isArray(info?.services) ? info.services : []) as ServiceItem[]

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="neon-text text-2xl font-semibold">{t.knowledge.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.knowledge.subtitle}</p>
      </div>
      <ServicesEditor initial={services} />
      <FaqsEditor initial={(faqs ?? []) as FaqRow[]} />
    </div>
  )
}
