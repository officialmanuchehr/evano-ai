import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { GoogleCalendarCard } from '@/components/integrations/google-calendar-card'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.integrations.title }
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

// =============================================================================
// Dashboard → Integrations
// =============================================================================
export default async function IntegrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')

  const { t } = await getI18n()
  const googleResult = (await searchParams).google
  // Admin client, explicit columns: the encrypted token never leaves the server
  const { data: google } = await createAdminClient()
    .from('integrations')
    .select('status, provider_account_id')
    .eq('organization_id', auth.profile.organization_id)
    .eq('provider', 'google_calendar')
    .maybeSingle()

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="neon-text text-2xl font-semibold">{t.integrations.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.integrations.subtitle}</p>
      </div>

      <GoogleCalendarCard
        status={google?.status === 'connected' || google?.status === 'error' ? google.status : null}
        email={google?.provider_account_id ?? null}
        result={typeof googleResult === 'string' ? googleResult : null}
      />
    </div>
  )
}
