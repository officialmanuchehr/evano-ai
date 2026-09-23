import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { BookingForm } from '@/components/bookings/booking-form'
import { createBookingAction } from '@/lib/actions/bookings'
import { todayIn, toIsoDate } from '@/lib/bookings/availability'
import type { ServiceItem } from '@/lib/onboarding/constants'
import { getI18n } from '@/lib/i18n/server'
import { interpolate } from '@/lib/i18n/config'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.bookings.newTitle }
}

// =============================================================================
// Dashboard → Bookings → New
// =============================================================================
export default async function NewBookingPage() {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  const { t } = await getI18n()

  const supabase = await createClient()
  const { data: info } = await supabase
    .from('business_info')
    .select('services')
    .eq('organization_id', auth.profile.organization_id)
    .maybeSingle()
  const services = (Array.isArray(info?.services) ? info.services : []) as ServiceItem[]
  const timeZone = auth.profile.organizations?.timezone ?? 'UTC'

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="neon-text text-2xl font-semibold">{t.bookings.newTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{interpolate(t.bookings.timezoneNote, { tz: timeZone })}</p>
      </div>
      <BookingForm
        action={createBookingAction}
        services={services}
        submitLabel={t.bookings.create}
        defaults={{ customerName: '', customerPhone: '', service: '', date: toIsoDate(todayIn(timeZone)), time: '10:00', notes: '' }}
      />
    </div>
  )
}
