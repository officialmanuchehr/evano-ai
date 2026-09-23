import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { I18nProvider } from '@/lib/i18n/client'
import { getI18n } from '@/lib/i18n/server'
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
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <I18nProvider locale={locale} t={t}>
          {children}
        </I18nProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
