'use client'

import { useActionState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { connectTwilioNumberAction, disconnectPhoneAction } from '@/lib/actions/phone'
import { keepValues } from '@/lib/forms'

// =============================================================================
// Connect a Twilio number
// =============================================================================
export function ConnectTwilioForm() {
  const [, action, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await connectTwilioNumberAction(formData)
    if (result.success) toast.success('Number connected — your receptionist is live')
    else if (result.error) toast.error(result.error)
    return result
  }, null)

  return (
    <form onSubmit={keepValues(action)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="number">Twilio phone number</Label>
        <Input id="number" name="number" type="tel" placeholder="+12025550123" required disabled={pending} />
        <p className="text-xs text-muted-foreground">International format, starting with + and the country code.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="accountSid">Account SID</Label>
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
          <Label htmlFor="authToken">Auth token</Label>
          <Input id="authToken" name="authToken" type="password" autoComplete="off" required disabled={pending} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Your auth token is sent directly to our voice provider to connect the number — Evano AI does not store it.
      </p>

      <div className="flex justify-end">
        <Button type="submit" size="lg" className="neon-glow hover:neon-glow-strong px-6" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting…
            </>
          ) : (
            'Connect number'
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

  function disconnect() {
    if (!confirm('Disconnect this number? Calls will stop being answered by your receptionist.')) return
    startTransition(async () => {
      const result = await disconnectPhoneAction()
      if (result.success) toast.success('Number disconnected')
      else toast.error(result.error ?? 'Could not disconnect')
    })
  }

  return (
    <Button type="button" variant="destructive" onClick={disconnect} disabled={pending}>
      {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PhoneOff className="mr-1.5 h-4 w-4" />}
      Disconnect
    </Button>
  )
}
