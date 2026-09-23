'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/client'

// True only after hydration — the saved theme isn't known on the server
const subscribe = () => () => {}
function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}

// =============================================================================
// Single icon button: 🌙 in light mode (switch to dark), ☀️ in dark mode
// =============================================================================
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useI18n()
  const mounted = useMounted()
  const dark = mounted && resolvedTheme === 'dark'
  const label = dark ? t.common.themeToLight : t.common.themeToDark

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className
      )}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
