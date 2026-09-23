import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import { getAvailability, saveBooking } from '@/lib/bookings/service'
import { resolveOwner } from '@/lib/calls/record'

// =============================================================================
// Function tools the receptionist can call mid-conversation.
// Vapi POSTs a `tool-calls` message to our webhook; we answer with results the
// model reads (and speaks from). Shapes verified against Vapi's
// CreateFunctionToolDTO / ServerMessageToolCalls / ToolCallResult schemas.
// =============================================================================

// What the receptionist says while checking availability. The bilingual receptionist
// gets no fixed phrase (it can't know the caller's language in advance).
const CHECKING_PHRASE: Record<string, string> = {
  'en-US': 'One moment, let me check that for you.',
  'en-GB': 'One moment, let me check that for you.',
  'ru-RU': 'Минутку, сейчас проверю.',
  'tr-TR': 'Bir dakika, kontrol ediyorum.',
  'de-DE': 'Einen Moment, ich schaue nach.',
  'fr-FR': 'Un instant, je vérifie.',
  'es-ES': 'Un momento, lo compruebo.',
  'ar-SA': 'لحظة من فضلك، سأتحقق من ذلك.',
}

export function bookingTools(server: { url: string; headers: Record<string, string> }, language = 'en-US') {
  const phrase = CHECKING_PHRASE[language]
  return [
    {
      type: 'function',
      server,
      ...(phrase ? { messages: [{ type: 'request-start', content: phrase }] } : {}),
      function: {
        name: 'check_availability',
        description:
          'Find free appointment times on a given day. Always call this before offering or confirming a time.',
        parameters: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'The day the caller wants: "today", "tomorrow", a weekday like "friday", or YYYY-MM-DD.',
            },
            service: { type: 'string', description: 'The service the caller wants, if they said it.' },
          },
          required: ['date'],
        },
      },
    },
    {
      type: 'function',
      server,
      function: {
        name: 'book_appointment',
        description:
          'Book the appointment once the caller has chosen a free time from check_availability and confirmed their details.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Caller’s full name' },
            customer_phone: { type: 'string', description: 'Caller’s phone number' },
            service: { type: 'string', description: 'Service being booked' },
            date: { type: 'string', description: 'Same date value used with check_availability' },
            time: { type: 'string', description: 'Start time in 24-hour HH:MM, exactly as returned by check_availability' },
          },
          required: ['customer_name', 'date', 'time'],
        },
      },
    },
  ]
}

// ---------------------------------------------------------------- handler

type ToolCall = { id: string; function?: { name?: string; arguments?: string | Record<string, unknown> } }

export type ToolCallsMessage = {
  type: 'tool-calls'
  toolCallList?: ToolCall[]
  call?: { id?: string; assistantId?: string; phoneNumberId?: string; customer?: { number?: string } }
}

function parseArgs(raw: string | Record<string, unknown> | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v == null ? '' : String(v)]))
  } catch {
    return {}
  }
}

async function runTool(
  name: string,
  args: Record<string, string>,
  ctx: { orgId: string; agentId: string | null; callId: string | null; callerNumber: string | null }
): Promise<string> {
  if (name === 'check_availability') {
    const r = await getAvailability(ctx.orgId, args.date ?? '', args.service)
    if (r.ok) {
      return `Free start times on ${r.dateLabel} (${r.isoDate})${r.service ? ` for ${r.service}` : ''}, ${r.durationMin} minutes each: ${r.slots.join(', ')}.`
    }
    const open = r.openDays.length ? ` The business is open on ${r.openDays.join(', ')}.` : ''
    if (r.reason === 'bad_date') return `That date was not understood. Ask the caller which day they mean.${open}`
    if (r.reason === 'past') return `${r.dateLabel} is in the past. Ask for another day.${open}`
    if (r.reason === 'closed') return `The business is closed on ${r.dateLabel}.${open}`
    return `There are no free times left on ${r.dateLabel}. Offer another day.${open}`
  }

  if (name === 'book_appointment') {
    if (!args.customer_name?.trim()) return 'Ask for the caller’s name before booking.'
    const r = await saveBooking(
      ctx.orgId,
      {
        customerName: args.customer_name,
        // Fall back to the number they're calling from
        customerPhone: args.customer_phone || ctx.callerNumber,
        service: args.service || null,
        date: args.date ?? '',
        time: args.time ?? '',
      },
      { createdBy: 'ai', agentId: ctx.agentId, callId: ctx.callId }
    )
    return r.ok
      ? `Booked: ${r.service ?? 'appointment'} for ${args.customer_name} on ${r.dateLabel} at ${r.time}. Confirm this to the caller.`
      : `Not booked: ${r.error} Check availability again and offer another time.`
  }

  return `Unknown tool ${name}.`
}

/** Build the webhook response for a `tool-calls` message. */
export async function handleToolCalls(message: ToolCallsMessage) {
  const calls = message.toolCallList ?? []
  const owner = await resolveOwner(message.call)

  let callRowId: string | null = null
  if (owner && message.call?.id) {
    const { data } = await createAdminClient().from('calls').select('id').eq('provider_call_id', message.call.id).maybeSingle()
    callRowId = data?.id ?? null
  }

  const results = await Promise.all(
    calls.map(async (c) => {
      const name = c.function?.name ?? ''
      if (!owner) {
        return { name, toolCallId: c.id, result: 'Booking is unavailable right now. Offer to take a message instead.' }
      }
      try {
        const result = await runTool(name, parseArgs(c.function?.arguments), {
          orgId: owner.orgId,
          agentId: owner.agentId,
          callId: callRowId,
          callerNumber: message.call?.customer?.number ?? null,
        })
        return { name, toolCallId: c.id, result }
      } catch (err) {
        console.error('[vapi.tools]', name, err)
        return { name, toolCallId: c.id, result: 'Something went wrong. Offer to take a message instead.' }
      }
    })
  )
  return { results }
}
