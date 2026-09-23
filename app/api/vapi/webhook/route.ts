import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// =============================================================================
// Vapi server webhook — Vapi POSTs call events here.
// Authenticated by the shared secret header we configure on every assistant
// and phone number (x-evano-secret).
// =============================================================================

type VapiServerMessage = {
  type: string
  phoneNumber?: { id?: string }
  call?: { id?: string; phoneNumberId?: string }
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.VOICE_PROVIDER_WEBHOOK_SECRET
  const received = request.headers.get('x-evano-secret')
  if (!expected || !received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { message?: VapiServerMessage } | null
  const message = body?.message
  if (!message?.type) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  switch (message.type) {
    // Sent when a number has no assistant attached — i.e. the receptionist is paused
    case 'assistant-request': {
      const vapiNumberId = message.phoneNumber?.id ?? message.call?.phoneNumberId
      const db = createAdminClient()
      const { data: phone } = vapiNumberId
        ? await db.from('phone_numbers').select('organization_id').eq('provider_number_id', vapiNumberId).maybeSingle()
        : { data: null }
      const { data: org } = phone
        ? await db.from('organizations').select('name').eq('id', phone.organization_id).single()
        : { data: null }

      // Vapi speaks `error` to the caller and ends the call
      return NextResponse.json({
        error: `Thank you for calling${org?.name ? ` ${org.name}` : ''}. We can't take your call right now — please try again later.`,
      })
    }

    // Call logging (end-of-call-report, status-update) is handled in the next module
    default:
      return NextResponse.json({ received: true })
  }
}
