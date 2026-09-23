import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'

// =============================================================================
// Shared building blocks for each onboarding step
// =============================================================================

export function StepCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

/** Back link (optional) + primary submit button with pending state. */
export function StepActions({
  backHref,
  pending,
  submitLabel = 'Continue',
}: {
  backHref?: string
  pending: boolean
  submitLabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t pt-6">
      {backHref ? (
        <Link href={backHref} className={buttonVariants({ variant: 'ghost' })}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Link>
      ) : (
        <span />
      )}
      <Button type="submit" size="lg" className="neon-glow hover:neon-glow-strong px-5" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  )
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}
