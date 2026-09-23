import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { I18nProvider } from '@/lib/i18n/client'
import { getI18n } from '@/lib/i18n/server'
import { ThemeProvider, ThemedToaster } from '@/components/theme/theme-provider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'cyrillic'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return {
    title: { default: 'Evano AI', template: '%s — Evano AI' },
    description: t.meta.description,
  }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const { locale, t } = await getI18n()

  return (
    // suppressHydrationWarning: next-themes sets the theme class before React hydrates
    <html lang={locale} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <I18nProvider locale={locale} t={t}>
            {children}
            <ThemedToaster />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
