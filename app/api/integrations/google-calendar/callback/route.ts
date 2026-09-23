import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { completeConnection } from '@/lib/integrations/google-calendar'
import { GOOGLE_STATE_COOKIE as STATE_COOKIE } from '@/lib/integrations/constants'

// =============================================================================
// Google redirects here after consent: verify state, store the refresh token
// =============================================================================
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const back = (result: string) => {
    const res = NextResponse.redirect(new URL(`/dashboard/integrations?google=${result}`, origin))
    res.cookies.delete({ name: STATE_COOKIE, path: '/api/integrations/google-calendar' })
    return res
  }

  const auth = await getAuthenticatedUser()
  if (!auth) return NextResponse.redirect(new URL('/auth/login', origin))

  // User clicked "Cancel" on Google's consent screen
  if (searchParams.get('error')) return back('denied')

  const state = searchParams.get('state') ?? ''
  const expected = request.cookies.get(STATE_COOKIE)?.value ?? ''
  const stateOk =
    state.length > 0 && state.length === expected.length && timingSafeEqual(Buffer.from(state), Buffer.from(expected))
  const code = searchParams.get('code')
  if (!stateOk || !code) return back('invalid')

  try {
    await completeConnection(auth.profile.organization_id, code)
    return back('connected')
  } catch (err) {
    console.error('[google.callback]', err)
    return back('error')
  }
}
