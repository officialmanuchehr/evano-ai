'use client'

import { useActionState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand/logo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { updatePasswordAction } from '@/lib/actions/auth'
import { keepValues } from '@/lib/forms'
import { useI18n } from '@/lib/i18n/client'

// =============================================================================
// Set a new password — reached from the reset email via /auth/confirm
// (proxy.ts sends users without a session to login)
// =============================================================================
export default function ResetPasswordPage() {
  const { t } = useI18n()
  const r = t.auth.reset

  const [, action, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await updatePasswordAction(formData)
    if (!result.success && result.error) toast.error(result.error)
    return result
  }, null)

  return (
    <div className="relative min-h-screen flex items-center justify-center neon-backdrop px-4">
      <LanguageSwitcher className="absolute top-4 right-4" />
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <BrandMark size="lg" className="mx-auto" />
          <h1 className="text-2xl font-semibold tracking-tight">{r.title}</h1>
          <p className="text-sm text-muted-foreground">{r.subtitle}</p>
        </div>

        <form onSubmit={keepValues(action)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{r.newPassword}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={t.auth.register.passwordPlaceholder}
              required
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">{t.auth.register.passwordHint}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{r.confirm}</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required disabled={pending} />
          </div>

          <Button type="submit" className="w-full neon-glow hover:neon-glow-strong" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.common.saving}
              </>
            ) : (
              r.submit
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
