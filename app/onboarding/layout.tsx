import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { BrandLogo } from '@/components/brand/logo'
import { OnboardingStepper } from '@/components/onboarding/stepper'
import { logoutAction } from '@/lib/actions/auth'

export const metadata: Metadata = { title: 'Set up your receptionist' }

// =============================================================================
// Onboarding shell — signed-in users who haven't finished setup
// =============================================================================
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')
  if (auth.profile.onboarding_completed) redirect('/dashboard')

  return (
    <div className="min-h-screen neon-backdrop">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b bg-background/70 px-4 backdrop-blur sm:px-6">
        <BrandLogo />
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-8 sm:py-12">
        <OnboardingStepper />
        {children}
      </main>
    </div>
  )
}
