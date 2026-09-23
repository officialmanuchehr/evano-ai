'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand/logo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { resetPasswordAction } from '@/lib/actions/auth'
import { useI18n } from '@/lib/i18n/client'

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const f = t.auth.forgot
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  // /auth/confirm sends people back here when a reset link is expired or reused
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'link') {
      toast.error(f.linkExpired)
    }
  }, [f.linkExpired])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const result = await resetPasswordAction(new FormData(e.currentTarget))
    setPending(false)

    if (result.success) setSent(true)
    else toast.error(result.error || t.common.somethingWrong)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center neon-backdrop px-4">
      <LanguageSwitcher className="absolute top-4 right-4" />
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <BrandMark size="lg" className="mx-auto" />
          <h1 className="text-2xl font-semibold tracking-tight">{f.title}</h1>
          <p className="text-sm text-muted-foreground">{f.subtitle}</p>
        </div>

        {sent ? (
          <div className="rounded-lg border bg-card p-6 text-center space-y-3">
            <CheckCircle className="mx-auto h-8 w-8 text-primary" />
            <p className="font-medium">{f.sentTitle}</p>
            <p className="text-sm text-muted-foreground">{f.sentText}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button type="submit" className="w-full neon-glow hover:neon-glow-strong" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {f.submitting}
                </>
              ) : (
                f.submit
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-foreground font-medium underline underline-offset-4">
            {f.backToSignIn}
          </Link>
        </p>
      </div>
    </div>
  )
}
