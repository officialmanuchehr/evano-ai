import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod/v4'

// =============================================================================
// Summarise a finished call with Claude (structured output).
// Runs after the webhook has already answered Vapi, so latency doesn't matter.
// =============================================================================

const SUMMARY_MODEL = 'claude-opus-5'

export const CALL_PURPOSES = ['faq', 'booking', 'cancellation', 'rescheduling', 'general', 'transfer', 'unknown'] as const

const CallSummarySchema = z.object({
  summary: z.string().describe('2–3 sentences for the business owner: who called, what they wanted, how it ended'),
  purpose: z.enum(CALL_PURPOSES).describe('Main reason for the call'),
  caller_name: z.string().nullable().describe('Caller name if they gave it, else null'),
  follow_up_needed: z.boolean().describe('True if the business must act (call back, confirm a booking, answer an open question)'),
})

export type CallSummary = z.infer<typeof CallSummarySchema>

export type TranscriptLine = { role: 'assistant' | 'caller'; text: string }

let client: Anthropic | null = null
function anthropic() {
  client ??= new Anthropic({ apiKey: process.env.AI_PROVIDER_API_KEY })
  return client
}

/** Returns null when there is nothing to summarise or the request is declined. */
export async function summarizeCall(transcript: TranscriptLine[], businessName: string): Promise<CallSummary | null> {
  if (!transcript.some((l) => l.role === 'caller')) return null

  const conversation = transcript
    .map((l) => `${l.role === 'assistant' ? 'Receptionist' : 'Caller'}: ${l.text}`)
    .join('\n')

  const response = await anthropic().beta.messages.parse({
    model: SUMMARY_MODEL,
    max_tokens: 16000,
    // Server-side fallback: if the request is declined, it is re-run on the
    // recommended fallback model instead of returning a refusal
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(CallSummarySchema) },
    system:
      'You summarise phone calls handled by an AI receptionist for a small business. ' +
      'Write for the business owner, in English, factually — only what was said on the call.',
    messages: [
      {
        role: 'user',
        content: `Business: ${businessName}\n\n<transcript>\n${conversation}\n</transcript>`,
      },
    ],
  })

  if (response.stop_reason === 'refusal') {
    console.warn('[call-summary] declined', response.stop_details)
    return null
  }
  return response.parsed_output ?? null
}
