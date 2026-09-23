'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand/logo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPasswordAction } from '@/lib/actions/auth'
import { Loader2, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  // /auth/confirm sends people back here when a reset link is expired or reused
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'link') {
      toast.error('That reset link has expired or was already used. Request a new one below.')
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const formData = new FormData(e.currentTarget)
    const result = await resetPasswordAction(formData)
    setPending(false)

    if (result.success) {
      setSent(true)
    } else {
      toast.error(result.error || 'Something went wrong.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center neon-backdrop px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <BrandMark size="lg" className="mx-auto" />
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border bg-card p-6 text-center space-y-3">
            <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
            <p className="font-medium">Check your email</p>
            <p className="text-sm text-muted-foreground">
              We sent a password reset link. Check your inbox and spam folder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                required
                disabled={pending}
              />
            </div>

            <Button type="submit" className="w-full neon-glow hover:neon-glow-strong" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-foreground font-medium underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
