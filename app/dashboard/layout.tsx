import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getAuthenticatedUser()

  if (!auth) {
    redirect('/auth/login')
  }

  const { profile } = auth

  // New accounts must finish the setup wizard before using the dashboard
  if (!profile.onboarding_completed) {
    redirect('/onboarding/business')
  }
  const orgName = profile.organizations?.name ?? 'My Business'

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar orgName={orgName} />

      {/* Main content area — offset for sidebar on desktop, header on mobile */}
      <main className="lg:pl-56 pt-14 lg:pt-0">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  )
}
