import Link from 'next/link'
import type { Metadata } from 'next'
import {
  PhoneIncoming,
  CalendarCheck,
  MessageSquareText,
  PhoneForwarded,
  Moon,
  LayoutDashboard,
  ArrowRight,
  Check,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { BrandMark, BrandLogo } from '@/components/brand/logo'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { getI18n } from '@/lib/i18n/server'
import { cn } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: { absolute: t.meta.title } }
}

// Icons in the same order as t.home.features
const FEATURE_ICONS = [PhoneIncoming, CalendarCheck, MessageSquareText, PhoneForwarded, Moon, LayoutDashboard]

// =============================================================================
// Page
// =============================================================================
export default async function HomePage() {
  const { t } = await getI18n()
  const h = t.home

  return (
    <div className="min-h-screen bg-background">
      {/* ---------------------------------------------------------------- Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link href="/" aria-label="Evano AI">
            <BrandLogo />
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/auth/login" className={buttonVariants({ variant: 'ghost' })}>
              {h.signIn}
            </Link>
            <Link href="/auth/register" className={cn(buttonVariants(), 'neon-glow hover:neon-glow-strong')}>
              {h.getStarted}
            </Link>
          </nav>
        </div>
      </header>

      {/* --------------------------------------------------------------- Hero */}
      <section className="neon-backdrop">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {h.heroBefore}{' '}
              <span className="bg-linear-to-r from-primary to-neon bg-clip-text text-transparent">{h.heroHighlight}</span>{' '}
              {h.heroAfter}
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">{h.heroText}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/register"
                className={cn(buttonVariants({ size: 'lg' }), 'neon-glow hover:neon-glow-strong h-11 px-6 text-base')}
              >
                {h.startFree}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
              <Link
                href="#how-it-works"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 px-6 text-base')}
              >
                {h.seeHow}
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {h.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          {/* Illustrative call card */}
          <div className="relative mx-auto w-full max-w-md" aria-hidden>
            <div className="absolute -inset-6 rounded-[2rem] bg-linear-to-br from-primary/20 to-neon/25 blur-2xl" />
            <div className="relative space-y-4 rounded-2xl border bg-card p-5 neon-glow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="neon-gradient flex h-10 w-10 items-center justify-center rounded-full">
                    <PhoneIncoming className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{h.demo.incoming}</p>
                    <p className="text-xs text-muted-foreground">{h.demo.answeredBy}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                  {h.demo.live}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <p className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2">{h.demo.line1}</p>
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-primary-foreground">
                  {h.demo.line2}
                </p>
                <p className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2">{h.demo.line3}</p>
              </div>

              <div className="flex items-center gap-3 rounded-xl border bg-background px-3.5 py-3">
                <CalendarCheck className="h-5 w-5 text-success" />
                <div className="text-sm">
                  <p className="font-medium">{h.demo.booked}</p>
                  <p className="text-xs text-muted-foreground">{h.demo.bookedWhen}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {h.featuresTitleBefore} <span className="neon-text">{h.featuresTitleHighlight}</span>
          </h2>
          <p className="mt-3 text-muted-foreground">{h.featuresSubtitle}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {h.features.map(({ title, body }, i) => {
            const Icon = FEATURE_ICONS[i]
            return (
              <div key={title} className="neon-card rounded-xl border bg-card p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ------------------------------------------------------- How it works */}
      <section id="how-it-works" className="scroll-mt-16 border-y bg-muted/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight sm:text-4xl">{h.stepsTitle}</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {h.steps.map((step, i) => (
              <li key={step.title} className="rounded-xl border bg-card p-6">
                <span className="neon-gradient neon-glow mb-4 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="font-medium">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="neon-gradient neon-glow-strong relative overflow-hidden rounded-3xl px-6 py-14 text-center text-primary-foreground sm:px-12">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{h.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">{h.ctaText}</p>
          <Link
            href="/auth/register"
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'lg' }),
              'mt-8 h-11 bg-background px-6 text-base text-primary hover:bg-background/90'
            )}
          >
            {h.ctaButton}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------------- Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <BrandMark />
            <span>© {new Date().getFullYear()} Evano AI</span>
          </div>
          <nav className="flex flex-wrap items-center gap-5">
            <LanguageSwitcher />
            <Link href="/auth/login" className="hover:text-foreground">
              {h.signIn}
            </Link>
            <Link href="/auth/register" className="hover:text-foreground">
              {h.createAccount}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
