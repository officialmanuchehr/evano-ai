import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { buildAuthUrl } from '@/lib/integrations/google-calendar'
import { GOOGLE_STATE_COOKIE as STATE_COOKIE } from '@/lib/integrations/constants'

// =============================================================================
// Start Google Calendar OAuth — signed-in owners only (proxy.ts enforces login)
// =============================================================================
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if (!auth) return NextResponse.redirect(new URL('/auth/login', request.nextUrl.origin))

  // CSRF protection: the callback must return this exact value
  const state = randomBytes(24).toString('base64url')
  const response = NextResponse.redirect(buildAuthUrl(state))
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax', // sent on Google's top-level redirect back to us
    path: '/api/integrations/google-calendar',
    maxAge: 600,
  })
  return response
}
