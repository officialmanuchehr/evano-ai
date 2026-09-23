'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/client'

// True only after hydration — the saved theme isn't known on the server
const subscribe = () => () => {}
function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}

// =============================================================================
// Light | Dark | System switch
// =============================================================================
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  const mounted = useMounted()

  const options = [
    { value: 'light', label: t.common.themeLight, icon: Sun },
    { value: 'dark', label: t.common.themeDark, icon: Moon },
    { value: 'system', label: t.common.themeSystem, icon: Monitor },
  ] as const

  return (
    <div role="group" aria-label={t.common.theme} className={cn('inline-flex items-center gap-0.5 rounded-lg border p-0.5', className)}>
      {options.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        )
      })}
    </div>
  )
}
