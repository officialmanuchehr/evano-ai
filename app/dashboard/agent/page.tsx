import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Bot, Clock, HelpCircle, Moon, Sparkles } from 'lucide-react'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { AgentForm } from '@/components/agent/agent-form'
import { LiveToggle } from '@/components/agent/live-toggle'
import { TestCall } from '@/components/agent/test-call'
import { WEEK_DAYS, AFTER_HOURS_OPTIONS, type ServiceItem } from '@/lib/onboarding/constants'
import { resolveVoice, type ResponseLength, type Tone } from '@/lib/agent/constants'

export const metadata: Metadata = { title: 'AI Receptionist' }

const STATUS_COPY = {
  draft: { label: 'Draft', note: 'Not answering calls yet — connect a phone number to go live.' },
  active: { label: 'Live', note: 'Answering calls on your connected number.' },
  paused: { label: 'Paused', note: 'Calls are not being answered by AI right now.' },
} as const

// =============================================================================
// Dashboard → AI Receptionist settings
// =============================================================================
export default async function AgentPage() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')

  const orgId = auth.profile.organization_id
  const supabase = await createClient()

  const [{ data: agent }, { data: hours }, { data: info }, { count: faqCount }, { data: phone }] = await Promise.all([
    supabase
      .from('ai_agents')
      .select('name, greeting, tone, response_length, language, voice_id, system_prompt, status')
      .eq('organization_id', orgId)
      .single(),
    supabase
      .from('business_hours')
      .select('day_of_week, is_closed, open_time, close_time')
      .eq('organization_id', orgId),
    supabase
      .from('business_info')
      .select('services, after_hours_behavior')
      .eq('organization_id', orgId)
      .maybeSingle(),
    supabase.from('faqs').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
    supabase.from('phone_numbers').select('phone_number').eq('organization_id', orgId).maybeSingle(),
  ])

  if (!agent) {
    return <div className="p-8 text-sm text-muted-foreground">No receptionist found for this account.</div>
  }

  const status = STATUS_COPY[agent.status]
  const services = Array.isArray(info?.services) ? (info.services as ServiceItem[]) : []
  const afterHours = AFTER_HOURS_OPTIONS.find((o) => o.value === info?.after_hours_behavior)

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="neon-text text-2xl font-semibold">AI Receptionist</h1>
          <p className="mt-1 text-sm text-muted-foreground">Shape how your receptionist sounds and behaves on calls.</p>
        </div>
        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="gap-1.5">
          <span
            className={
              agent.status === 'active'
                ? 'h-1.5 w-1.5 rounded-full bg-neon shadow-[0_0_6px_var(--neon)]'
                : 'h-1.5 w-1.5 rounded-full bg-muted-foreground'
            }
          />
          {status.label}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* Settings form */}
        <AgentForm
          businessName={auth.profile.organizations?.name ?? ''}
          initial={{
            name: agent.name,
            greeting: agent.greeting ?? '',
            tone: agent.tone as Tone,
            response_length: agent.response_length as ResponseLength,
            language: agent.language,
            voice_id: resolveVoice(agent.voice_id, agent.language).id,
            system_prompt: agent.system_prompt ?? '',
          }}
        />

        {/* Side panel */}
        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium">Status</h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{status.note}</p>
            <LiveToggle status={agent.status} phoneNumber={phone?.phone_number ?? null} />
          </div>

          <TestCall />

          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium">What it knows</h2>
            </div>

            {/* Hours */}
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Hours
              </p>
              <ul className="space-y-0.5 text-sm">
                {WEEK_DAYS.map(({ day, label }) => {
                  const h = hours?.find((x) => x.day_of_week === day)
                  return (
                    <li key={day} className="flex justify-between gap-2">
                      <span>{label.slice(0, 3)}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {!h || h.is_closed ? 'Closed' : `${h.open_time?.slice(0, 5)}–${h.close_time?.slice(0, 5)}`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Services */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Services</p>
              {services.length ? (
                <ul className="space-y-0.5 text-sm">
                  {services.map((s) => (
                    <li key={s.name} className="flex justify-between gap-2">
                      <span className="truncate">{s.name}</span>
                      <span className="flex-shrink-0 text-muted-foreground">{s.price || (s.duration ? `${s.duration} min` : '')}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No services added yet.</p>
              )}
            </div>

            {/* FAQs + after hours */}
            <p className="flex items-center gap-1.5 text-sm">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              {faqCount ?? 0} {faqCount === 1 ? 'FAQ' : 'FAQs'}
            </p>
            {afterHours && (
              <p className="flex items-start gap-1.5 text-sm">
                <Moon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span>
                  <span className="text-muted-foreground">After hours: </span>
                  {afterHours.label}
                </span>
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
