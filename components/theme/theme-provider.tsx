'use client'

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { Toaster } from 'sonner'

// =============================================================================
// Light / dark theme (class on <html>, saved in localStorage by next-themes).
// Light is the default brand look; users can switch to dark or follow the OS.
// =============================================================================
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}

/** Toasts follow the current theme */
export function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  return <Toaster position="top-right" richColors theme={resolvedTheme === 'dark' ? 'dark' : 'light'} />
}
