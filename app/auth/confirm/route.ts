import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Email link landing (password reset, and later email confirmation).
// Supports both Supabase link styles:
//   ?token_hash=…&type=recovery   (works in any browser — recommended template)
//   ?code=…                        (PKCE — works in the browser that asked)
// Then forwards to `next` (same-site paths only).
// =============================================================================

function safeNext(next: string | null) {
  // Only allow internal paths — never redirect to another site
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = safeNext(searchParams.get('next'))
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')

  const supabase = await createClient()
  let error: unknown = null

  if (tokenHash && type) {
    ;({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }))
  } else if (code) {
    ;({ error } = await supabase.auth.exchangeCodeForSession(code))
  } else {
    error = new Error('missing token')
  }

  if (error) {
    console.error('[auth.confirm]', error)
    return NextResponse.redirect(new URL('/auth/forgot-password?error=link', origin))
  }

  return NextResponse.redirect(new URL(next, origin))
}
