import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ExternalLink, Phone, PhoneCall } from 'lucide-react'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { ConnectTwilioForm, DisconnectButton } from '@/components/phone/connect-form'

export const metadata: Metadata = { title: 'Phone' }

const SETUP_STEPS = [
  {
    title: 'Get a Twilio number',
    body: 'In the Twilio Console, buy a phone number with Voice capability in the country your customers call from.',
  },
  {
    title: 'Copy your credentials',
    body: 'On the Twilio Console home page, copy the Account SID and Auth token.',
  },
  {
    title: 'Connect it below',
    body: 'We link the number to your receptionist and it starts answering calls right away.',
  },
]

// =============================================================================
// Dashboard → Phone
// =============================================================================
export default async function PhonePage() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')

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
        <h1 className="neon-text text-2xl font-semibold">Phone</h1>
        <p className="mt-1 text-sm text-muted-foreground">The number your customers call to reach your receptionist.</p>
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
                  Twilio · connected {new Date(phone.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </p>
              </div>
            </div>
            <Badge variant={live ? 'default' : 'secondary'}>{live ? 'Live' : 'Paused'}</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {live
              ? 'Your receptionist answers every call to this number.'
              : 'Your receptionist is paused — callers hear a short “can’t take your call” message.'}{' '}
            <Link href="/dashboard/agent" className="text-primary underline-offset-4 hover:underline">
              {live ? 'Pause or change settings' : 'Go live'}
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
              Connect your Twilio number
            </h2>
            <ol className="mb-6 grid gap-4 sm:grid-cols-3">
              {SETUP_STEPS.map((step, i) => (
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
            Open Twilio Console
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </>
      )}
    </div>
  )
}
