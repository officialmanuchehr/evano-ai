import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { BusinessForm } from '@/components/onboarding/business-form'
import { HoursForm, type DayHours } from '@/components/onboarding/hours-form'
import { AccountForms } from '@/components/settings/account-forms'
import { updateBusinessSettingsAction, updateHoursSettingsAction } from '@/lib/actions/settings'
import { getI18n } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.settings.title }
}

function Section({ id, title, text, children }: { id: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 rounded-xl border bg-card p-5 sm:p-6">
      <div className="mb-5">
        <h2 id={`${id}-title`} className="font-medium">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      {children}
    </section>
  )
}

// =============================================================================
// Dashboard → Settings
// =============================================================================
export default async function SettingsPage() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  const { t } = await getI18n()
  const s = t.settings

  const orgId = auth.profile.organization_id
  const org = auth.profile.organizations
  const supabase = await createClient()
  const [{ data: info }, { data: rows }] = await Promise.all([
    supabase
      .from('business_info')
      .select('phone, email, website, address, description, after_hours_behavior, transfer_number')
      .eq('organization_id', orgId)
      .maybeSingle(),
    supabase.from('business_hours').select('day_of_week, is_closed, open_time, close_time').eq('organization_id', orgId),
  ])

  // One entry per weekday; DB TIME "09:00:00" → "09:00" for <input type="time">
  const hours: DayHours[] = [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const row = rows?.find((r) => r.day_of_week === day)
    return {
      day,
      isClosed: row ? row.is_closed : day === 0 || day === 6,
      open: row?.open_time?.slice(0, 5) ?? '09:00',
      close: row?.close_time?.slice(0, 5) ?? '17:00',
    }
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="neon-text text-2xl font-semibold">{s.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{s.subtitle}</p>
      </div>

      <Section id="business" title={s.business} text={s.businessText}>
        <BusinessForm
          action={updateBusinessSettingsAction}
          submitLabel={t.common.save}
          successMessage={s.saved}
          defaults={{
            name: org?.name ?? '',
            industry: org?.industry ?? null,
            timezone: org?.timezone ?? 'UTC',
            phone: info?.phone ?? null,
            email: info?.email ?? null,
            website: info?.website ?? null,
            address: info?.address ?? null,
            description: info?.description ?? null,
          }}
        />
      </Section>

      <Section id="hours" title={s.hours} text={s.hoursText}>
        <HoursForm
          action={updateHoursSettingsAction}
          backHref={null}
          submitLabel={t.common.save}
          successMessage={s.saved}
          initialHours={hours}
          initialAfterHours={info?.after_hours_behavior ?? 'ai'}
          initialTransferNumber={info?.transfer_number ?? ''}
        />
      </Section>

      <Section id="account" title={s.account} text={s.accountText}>
        <AccountForms fullName={auth.profile.full_name ?? ''} email={auth.profile.email} />
      </Section>
    </div>
  )
}
