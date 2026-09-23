'use client'

import { Suspense, useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand/logo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { loginAction } from '@/lib/actions/auth'
import { keepValues } from '@/lib/forms'
import { useI18n } from '@/lib/i18n/client'

function LoginForm() {
  const { t } = useI18n()
  const l = t.auth.login
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [, action, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await loginAction(formData)
    if (!result.success && result.error) toast.error(result.error)
    return result
  }, null)

  return (
    <div className="relative min-h-screen flex items-center justify-center neon-backdrop px-4">
      <LanguageSwitcher className="absolute top-4 right-4" />
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <BrandMark size="lg" className="mx-auto" />
          <h1 className="text-2xl font-semibold tracking-tight">{l.title}</h1>
          <p className="text-sm text-muted-foreground">{l.subtitle}</p>
        </div>

        <form onSubmit={keepValues(action)} className="space-y-4">
          <input type="hidden" name="next" value={next} />

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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {l.forgot}
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={l.passwordPlaceholder}
              required
              disabled={pending}
            />
          </div>

          <Button type="submit" className="w-full neon-glow hover:neon-glow-strong" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {l.submitting}
              </>
            ) : (
              l.submit
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {l.noAccount}{' '}
          <Link href="/auth/register" className="text-foreground font-medium underline underline-offset-4">
            {l.createOne}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
