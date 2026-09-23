'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/client'
import { LOCALES, type Locale } from '@/lib/i18n/config'
import { setLocaleAction } from '@/lib/actions/locale'

// =============================================================================
// EN | RU toggle
// =============================================================================
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function change(next: Locale) {
    if (next === locale) return
    startTransition(async () => {
      await setLocaleAction(next)
      router.refresh()
    })
  }

  return (
    <div
      role="group"
      aria-label={t.common.language}
      className={cn('inline-flex items-center gap-1 rounded-lg border p-0.5 text-xs', pending && 'opacity-60', className)}
    >
      <Globe className="ml-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => change(l)}
          aria-pressed={locale === l}
          disabled={pending}
          className={cn(
            'rounded-md px-2 py-1 font-medium uppercase transition-colors',
            locale === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
