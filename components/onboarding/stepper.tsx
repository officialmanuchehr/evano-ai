'use client'

import { usePathname } from 'next/navigation'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ONBOARDING_STEPS } from '@/lib/onboarding/constants'
import { useI18n } from '@/lib/i18n/client'

// =============================================================================
// Onboarding progress — highlights the current step from the URL
// =============================================================================
export function OnboardingStepper() {
  const pathname = usePathname()
  const { t } = useI18n()
  const currentIndex = Math.max(
    0,
    ONBOARDING_STEPS.findIndex((s) => pathname.startsWith(`/onboarding/${s.slug}`))
  )

  return (
    <ol className="flex items-center gap-2 sm:gap-4" aria-label={t.onboarding.progress}>
      {ONBOARDING_STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex

        return (
          <li key={step.slug} className="flex flex-1 items-center gap-2 sm:gap-3">
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'neon-gradient neon-glow border-transparent text-primary-foreground',
                !done && !active && 'bg-background text-muted-foreground'
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="hidden min-w-0 sm:block">
              <p className={cn('truncate text-sm font-medium', !active && !done && 'text-muted-foreground')}>
                {t.onboarding.steps[step.slug].title}
              </p>
              <p className="truncate text-xs text-muted-foreground">{t.onboarding.steps[step.slug].description}</p>
            </div>
            {i < ONBOARDING_STEPS.length - 1 && (
              <span className={cn('h-px flex-1', done ? 'bg-primary' : 'bg-border')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
