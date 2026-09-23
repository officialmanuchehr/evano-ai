import { redirect } from 'next/navigation'

// /onboarding → first step
export default function OnboardingIndexPage() {
  redirect('/onboarding/business')
}
