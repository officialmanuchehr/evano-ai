'use client'

import { useActionState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { changePasswordAction, updateProfileAction } from '@/lib/actions/settings'
import { keepValues } from '@/lib/forms'
import { useI18n } from '@/lib/i18n/client'

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  )
}

// =============================================================================
// Account: name, sign-in email (read-only), interface language, password
// =============================================================================
export function AccountForms({ fullName, email }: { fullName: string; email: string }) {
  const { t } = useI18n()
  const s = t.settings

  const [, saveName, savingName] = useActionState(async (_: unknown, fd: FormData) => {
    const r = await updateProfileAction(fd)
    if (r.success) toast.success(s.saved)
    else toast.error(r.error)
    return r
  }, null)

  const [, savePassword, savingPassword] = useActionState(async (_: unknown, fd: FormData) => {
    const r = await changePasswordAction(fd)
    if (r.success) toast.success(s.passwordChanged)
    else toast.error(r.error)
    return r
  }, null)

  return (
    <div className="space-y-6">
      {/* Name + email + language */}
      <form onSubmit={keepValues(saveName)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">{s.fullName}</Label>
            <Input id="fullName" name="fullName" defaultValue={fullName} required disabled={savingName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signInEmail">{s.email}</Label>
            <Input id="signInEmail" value={email} readOnly disabled />
            <p className="text-xs text-muted-foreground">{s.emailNote}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="w-40">{t.common.interfaceLanguage}</span>
              <LanguageSwitcher />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-40">{t.common.theme}</span>
              <ThemeToggle className="border" />
            </div>
          </div>
          <Submit pending={savingName} label={s.saveProfile} />
        </div>
      </form>

      {/* Password */}
      <form onSubmit={keepValues(savePassword)} className="space-y-4 border-t pt-6">
        <h3 className="text-sm font-medium">{s.password}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password">{s.newPassword}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={t.auth.register.passwordPlaceholder}
              required
              disabled={savingPassword}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{s.confirmPassword}</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required disabled={savingPassword} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t.auth.register.passwordHint}</p>
        <div className="flex justify-end">
          <Submit pending={savingPassword} label={s.changePassword} />
        </div>
      </form>
    </div>
  )
}
