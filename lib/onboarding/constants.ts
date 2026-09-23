// =============================================================================
// Onboarding — shared constants (used by server actions and client forms)
// =============================================================================

export const ONBOARDING_STEPS = [
  { slug: 'business', title: 'Business', description: 'Who you are' },
  { slug: 'hours', title: 'Hours', description: 'When you are open' },
  { slug: 'services', title: 'Services & FAQs', description: 'What callers ask about' },
] as const

export type OnboardingStepSlug = (typeof ONBOARDING_STEPS)[number]['slug']

export const INDUSTRIES = [
  'Beauty & salon',
  'Clinic & healthcare',
  'Dental',
  'Fitness & wellness',
  'Restaurant & cafe',
  'Real estate',
  'Legal services',
  'Auto services',
  'Home services',
  'Education & tutoring',
  'Other',
] as const

// Curated list — keeps server and client render identical (no hydration drift)
export const TIMEZONES = [
  'UTC',
  'Asia/Dushanbe',
  'Asia/Tashkent',
  'Asia/Almaty',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Europe/Berlin',
  'Europe/London',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Australia/Sydney',
] as const

// 0 = Sunday … 6 = Saturday (matches business_hours.day_of_week).
// Displayed Monday-first.
export const WEEK_DAYS = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' },
  { day: 0, label: 'Sunday' },
] as const

export const AFTER_HOURS_OPTIONS = [
  { value: 'ai', label: 'AI answers and takes a message or booking' },
  { value: 'voicemail', label: 'Send callers to voicemail' },
  { value: 'transfer', label: 'Forward calls to another number' },
] as const

// Shared look for native <select> elements (matches the Input component)
export const selectClassName =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2 text-base md:text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50'

export type ServiceItem = {
  name: string
  duration: number | null // minutes
  price: string
}

export type FaqItem = {
  question: string
  answer: string
}
