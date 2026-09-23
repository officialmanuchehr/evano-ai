import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ExternalLink, Phone, PhoneCall } from 'lucide-react'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { ConnectTwilioForm, DisconnectButton } from '@/components/phone/connect-form'
import { getI18n } from '@/lib/i18n/server'
import { INTL_LOCALE, interpolate } from '@/lib/i18n/config'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.phone.title }
}

// =============================================================================
// Dashboard → Phone
// =============================================================================
export default async function PhonePage() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')

  const { locale, t } = await getI18n()
  const p = t.phone
  const supabase = await createClient()
  const [{ data: phone }, { data: agent }] = await Promise.all([
    supabase
      .from('phone_numbers')
      .select('phone_number, provider, status, created_at')
      .eq('organization_id', auth.profile.organization_id)
      .maybeSingle(),
    supabase.from('ai_agents').select('status').eq('organization_id', auth.profile.organization_id).single(),
  ])

  const live = agent?.status === 'active'

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-8">
      <div>
        <h1 className="neon-text text-2xl font-semibold">{p.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{p.subtitle}</p>
      </div>

      {phone ? (
        /* ---------------------------------------------------- Connected */
        <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="neon-gradient neon-glow flex h-11 w-11 items-center justify-center rounded-full">
                <PhoneCall className="h-5 w-5 text-primary-foreground" />
              </span>
              <div>
                <p className="text-lg font-semibold tabular-nums">{phone.phone_number}</p>
                <p className="text-xs text-muted-foreground">
                  {interpolate(p.connectedOn, { date: new Date(phone.created_at).toLocaleDateString(INTL_LOCALE[locale], { dateStyle: 'medium' }) })}
                </p>
              </div>
            </div>
            <Badge variant={live ? 'default' : 'secondary'}>{live ? p.live : p.paused}</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {live ? p.liveText : p.pausedText}{' '}
            <Link href="/dashboard/agent" className="text-primary underline-offset-4 hover:underline">
              {live ? p.pauseLink : p.goLiveLink}
            </Link>
          </p>

          <div className="flex justify-end border-t pt-5">
            <DisconnectButton />
          </div>
        </section>
      ) : (
        /* ------------------------------------------------ Not connected */
        <>
          <section className="rounded-xl border bg-card p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-medium">
              <Phone className="h-4 w-4 text-primary" />
              {p.connectTitle}
            </h2>
            <ol className="mb-6 grid gap-4 sm:grid-cols-3">
              {p.steps.map((step, i) => (
                <li key={step.title} className="rounded-lg bg-secondary/60 p-4">
                  <span className="neon-gradient mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
            <ConnectTwilioForm />
          </section>

          <a
            href="https://console.twilio.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            {p.openConsole}
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </>
      )}
    </div>
  )
}
