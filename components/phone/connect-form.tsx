'use client'

import { useActionState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { connectTwilioNumberAction, disconnectPhoneAction } from '@/lib/actions/phone'
import { useI18n } from '@/lib/i18n/client'
import { keepValues } from '@/lib/forms'

// =============================================================================
// Connect a Twilio number
// =============================================================================
export function ConnectTwilioForm() {
  const { t } = useI18n()
  const p = t.phone
  const [, action, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await connectTwilioNumberAction(formData)
    if (result.success) toast.success(p.connected)
    else if (result.error) toast.error(result.error)
    return result
  }, null)

  return (
    <form onSubmit={keepValues(action)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="number">{p.number}</Label>
        <Input id="number" name="number" type="tel" placeholder="+12025550123" required disabled={pending} />
        <p className="text-xs text-muted-foreground">{p.numberHint}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="accountSid">{p.accountSid}</Label>
          <Input
            id="accountSid"
            name="accountSid"
            placeholder="AC…"
            autoComplete="off"
            spellCheck={false}
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="authToken">{p.authToken}</Label>
          <Input id="authToken" name="authToken" type="password" autoComplete="off" required disabled={pending} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{p.tokenNote}</p>

      <div className="flex justify-end">
        <Button type="submit" size="lg" className="neon-glow hover:neon-glow-strong px-6" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {p.connecting}
            </>
          ) : (
            p.connect
          )}
        </Button>
      </div>
    </form>
  )
}

// =============================================================================
// Disconnect the current number
// =============================================================================
export function DisconnectButton() {
  const [pending, startTransition] = useTransition()
  const { t } = useI18n()

  function disconnect() {
    if (!confirm(t.phone.disconnectConfirm)) return
    startTransition(async () => {
      const result = await disconnectPhoneAction()
      if (result.success) toast.success(t.phone.disconnected)
      else toast.error(result.error ?? t.errors.phoneDisconnectFailed)
    })
  }

  return (
    <Button type="button" variant="destructive" onClick={disconnect} disabled={pending}>
      {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PhoneOff className="mr-1.5 h-4 w-4" />}
      {t.phone.disconnect}
    </Button>
  )
}
