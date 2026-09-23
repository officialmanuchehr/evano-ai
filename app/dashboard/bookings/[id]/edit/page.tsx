import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { BookingForm } from '@/components/bookings/booking-form'
import { rescheduleBookingAction } from '@/lib/actions/bookings'
import { toIsoDate, zonedParts } from '@/lib/bookings/availability'
import type { ServiceItem } from '@/lib/onboarding/constants'

export const metadata: Metadata = { title: 'Reschedule booking' }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// =============================================================================
// Dashboard → Bookings → Reschedule
// =============================================================================
export default async function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')

  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const orgId = auth.profile.organization_id
  const supabase = await createClient()
  const [{ data: booking }, { data: info }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, customer_name, customer_phone, service, start_time, notes, status')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle(),
    supabase.from('business_info').select('services').eq('organization_id', orgId).maybeSingle(),
  ])
  if (!booking || booking.status === 'cancelled') notFound()

  const timeZone = auth.profile.organizations?.timezone ?? 'UTC'
  const start = zonedParts(new Date(booking.start_time), timeZone)
  const services = (Array.isArray(info?.services) ? info.services : []) as ServiceItem[]

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="neon-text text-2xl font-semibold">Reschedule booking</h1>
        <p className="mt-1 text-sm text-muted-foreground">Times are in your business timezone ({timeZone}).</p>
      </div>
      <BookingForm
        action={rescheduleBookingAction.bind(null, booking.id)}
        services={services}
        submitLabel="Save changes"
        defaults={{
          customerName: booking.customer_name ?? '',
          customerPhone: booking.customer_phone ?? '',
          service: booking.service ?? '',
          date: toIsoDate(start),
          time: `${String(start.hour).padStart(2, '0')}:${String(start.minute).padStart(2, '0')}`,
          notes: booking.notes ?? '',
        }}
      />
    </div>
  )
}
