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
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: { absolute: 'Evano AI — Your AI receptionist, 24/7' },
}

// =============================================================================
// Content
// =============================================================================

const features = [
  {
    icon: PhoneIncoming,
    title: 'Answers every call',
    body: 'Picks up instantly, day or night, so callers never hear a busy tone or voicemail.',
  },
  {
    icon: CalendarCheck,
    title: 'Books appointments',
    body: 'Checks your hours and services, then books the slot and syncs it to your calendar.',
  },
  {
    icon: MessageSquareText,
    title: 'Answers questions',
    body: 'Prices, parking, opening hours — it replies from the FAQs and details you provide.',
  },
  {
    icon: PhoneForwarded,
    title: 'Forwards what matters',
    body: 'Urgent or complex calls are transferred to you or your team straight away.',
  },
  {
    icon: Moon,
    title: 'Works after hours',
    body: 'Take messages, book, or forward — you decide what happens when you are closed.',
  },
  {
    icon: LayoutDashboard,
    title: 'Everything in one place',
    body: 'Every call, summary and booking in a simple dashboard you can check anytime.',
  },
]

const steps = [
  { title: 'Tell us about your business', body: 'Name, services and the questions customers usually ask.' },
  { title: 'Set your hours', body: 'Choose when you are open and what happens after hours.' },
  { title: 'Connect your number', body: 'Forward your line to Evano AI and it starts answering.' },
]

// =============================================================================
// Page
// =============================================================================
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ---------------------------------------------------------------- Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Evano AI home">
            <BrandLogo />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/auth/login" className={buttonVariants({ variant: 'ghost' })}>
              Sign in
            </Link>
            <Link href="/auth/register" className={cn(buttonVariants(), 'neon-glow hover:neon-glow-strong')}>
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* --------------------------------------------------------------- Hero */}
      <section className="neon-backdrop">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-neon shadow-[0_0_8px_var(--neon)]" />
              AI receptionist for small businesses
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Never miss a{' '}
              <span className="bg-linear-to-r from-primary to-neon bg-clip-text text-transparent">
                customer call
              </span>{' '}
              again.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Evano AI answers your phone 24/7, books appointments, answers common questions and
              forwards urgent calls — so you can focus on your customers, not the ringing phone.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/register"
                className={cn(buttonVariants({ size: 'lg' }), 'neon-glow hover:neon-glow-strong h-11 px-6 text-base')}
              >
                Start free
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
              <Link
                href="#how-it-works"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 px-6 text-base')}
              >
                See how it works
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {['Set up in minutes', 'No credit card needed', 'Cancel anytime'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" />
                  {t}
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
                    <p className="text-sm font-medium">Incoming call</p>
                    <p className="text-xs text-muted-foreground">Answered by Evano AI</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-neon shadow-[0_0_8px_var(--neon)]" />
                  Live
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <p className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2">
                  Thanks for calling Bright Smile Dental. How can I help you today?
                </p>
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-primary-foreground">
                  Hi, can I book a cleaning for Saturday morning?
                </p>
                <p className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2">
                  Of course — I have 10:00 or 11:30 free on Saturday. Which works better?
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-xl border bg-background px-3.5 py-3">
                <CalendarCheck className="h-5 w-5 text-primary" />
                <div className="text-sm">
                  <p className="font-medium">Booked: Teeth cleaning</p>
                  <p className="text-xs text-muted-foreground">Saturday · 10:00 – 10:45</p>
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
            A front desk that <span className="neon-text">never sleeps</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything a great receptionist does — without the missed calls.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="neon-card rounded-xl border bg-card p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- How it works */}
      <section id="how-it-works" className="scroll-mt-16 border-y bg-muted/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Live in three steps
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
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
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Stop losing customers to voicemail</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Set up your AI receptionist today and let every call turn into a booking.
          </p>
          <Link
            href="/auth/register"
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'lg' }),
              'mt-8 h-11 bg-background px-6 text-base text-primary hover:bg-background/90'
            )}
          >
            Get started free
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
          <nav className="flex gap-5">
            <Link href="/auth/login" className="hover:text-foreground">Sign in</Link>
            <Link href="/auth/register" className="hover:text-foreground">Create account</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
