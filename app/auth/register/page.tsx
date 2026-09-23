'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand/logo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { registerAction } from '@/lib/actions/auth'
import { keepValues } from '@/lib/forms'
import { useI18n } from '@/lib/i18n/client'

export default function RegisterPage() {
  const { t } = useI18n()
  const r = t.auth.register

  const [, action, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await registerAction(formData)
    if (!result.success && result.error) toast.error(result.error)
    return result
  }, null)

  return (
    <div className="relative min-h-screen flex items-center justify-center neon-backdrop px-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <BrandMark size="lg" className="mx-auto" />
          <h1 className="text-2xl font-semibold tracking-tight">{r.title}</h1>
          <p className="text-sm text-muted-foreground">{r.subtitle}</p>
        </div>

        <form onSubmit={keepValues(action)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{r.fullName}</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder={r.fullNamePlaceholder}
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t.auth.emailPlaceholder}
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={r.passwordPlaceholder}
              required
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">{r.passwordHint}</p>
          </div>

          <Button type="submit" className="w-full neon-glow hover:neon-glow-strong" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {r.submitting}
              </>
            ) : (
              r.submit
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {r.haveAccount}{' '}
          <Link href="/auth/login" className="text-foreground font-medium underline underline-offset-4">
            {r.signIn}
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          {r.agreeBefore}{' '}
          <Link href="/terms" className="underline underline-offset-2">
            {r.terms}
          </Link>{' '}
          {r.and}{' '}
          <Link href="/privacy" className="underline underline-offset-2">
            {r.privacy}
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
