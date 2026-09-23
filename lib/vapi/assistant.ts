import { CALL_MODEL, DEFAULT_VOICE, LANGUAGES, MAX_TOKENS_BY_LENGTH, VOICES } from '@/lib/agent/constants'
import { WEEK_DAYS, type ServiceItem } from '@/lib/onboarding/constants'
import type { AiAgent, BusinessHour, BusinessInfo, Faq, Organization } from '@/types/database'

// =============================================================================
// Build the Vapi assistant for one organization.
// Pure function: business data in → Vapi CreateAssistantDTO payload out.
// =============================================================================

export type AssistantSource = {
  org: Pick<Organization, 'id' | 'name' | 'industry' | 'timezone'>
  agent: Pick<AiAgent, 'id' | 'name' | 'greeting' | 'tone' | 'response_length' | 'language' | 'system_prompt' | 'voice_id'>
  info: Pick<BusinessInfo, 'description' | 'address' | 'website' | 'phone' | 'email' | 'services' | 'after_hours_behavior' | 'transfer_number'> | null
  hours: Pick<BusinessHour, 'day_of_week' | 'is_closed' | 'open_time' | 'close_time'>[]
  faqs: Pick<Faq, 'question' | 'answer'>[]
}

const TONE_GUIDE = {
  professional: 'Be polite, calm and precise. Keep a professional front-desk manner.',
  friendly: 'Be warm, upbeat and welcoming — like a favourite front-desk person — while staying efficient.',
  casual: 'Be relaxed and conversational, using plain everyday language, while staying respectful.',
} as const

const LENGTH_GUIDE = {
  short: 'Keep every reply to one short sentence where possible.',
  balanced: 'Keep replies to one or two short sentences.',
  detailed: 'Replies may be up to three or four sentences when the caller needs detail.',
} as const

const AFTER_HOURS_GUIDE = {
  ai: 'If someone calls while the business is closed, still help them: answer questions, take a message, or collect booking details.',
  voicemail: 'If someone calls while the business is closed, tell them the business is closed, share the opening hours, and offer to take a short message.',
  transfer: 'If someone calls while the business is closed, tell them you will connect them to the team, then transfer the call.',
} as const

function formatHours(hours: AssistantSource['hours']): string {
  return WEEK_DAYS.map(({ day, label }) => {
    const h = hours.find((x) => x.day_of_week === day)
    if (!h || h.is_closed) return `- ${label}: closed`
    return `- ${label}: ${h.open_time?.slice(0, 5)}–${h.close_time?.slice(0, 5)}`
  }).join('\n')
}

function formatServices(services: ServiceItem[]): string {
  if (!services.length) return 'No services have been listed. If asked, offer to take the caller’s details so the team can follow up.'
  return services
    .map((s) => {
      const parts = [s.duration ? `${s.duration} min` : null, s.price || null].filter(Boolean)
      return `- ${s.name}${parts.length ? ` (${parts.join(', ')})` : ''}`
    })
    .join('\n')
}

/** The instructions Claude follows on every call. */
export function buildSystemPrompt(src: AssistantSource): string {
  const { org, agent, info, hours, faqs } = src
  const services = Array.isArray(info?.services) ? (info.services as ServiceItem[]) : []
  const language = LANGUAGES.find((l) => l.value === agent.language)?.label ?? 'English'

  const businessFacts = [
    `Business name: ${org.name}`,
    org.industry && `Industry: ${org.industry}`,
    info?.description && `About: ${info.description}`,
    info?.address && `Address: ${info.address}`,
    info?.phone && `Phone: ${info.phone}`,
    info?.email && `Email: ${info.email}`,
    info?.website && `Website: ${info.website}`,
    `Timezone: ${org.timezone}`,
  ]
    .filter(Boolean)
    .join('\n')

  const faqText = faqs.length
    ? faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
    : 'No FAQs have been added.'

  const afterHours =
    info?.after_hours_behavior === 'transfer' && info.transfer_number
      ? `${AFTER_HOURS_GUIDE.transfer} The transfer number is ${info.transfer_number}.`
      : AFTER_HOURS_GUIDE[info?.after_hours_behavior ?? 'ai']

  return `You are ${agent.name}, the AI phone receptionist for ${org.name}. You are speaking with a caller on a live phone call.

# How to speak
- This is a voice conversation: talk in short, natural spoken sentences. Never use lists, bullet points, markdown, emojis or special characters.
- Say times, prices and phone numbers the way a person would say them out loud.
- Ask one question at a time and wait for the answer.
- ${TONE_GUIDE[agent.tone]}
- ${LENGTH_GUIDE[agent.response_length]}
- Speak ${language} unless the caller clearly prefers another language.

# What you can help with
- Answer questions using only the business information below. If you do not know something, say so honestly and offer to take a message — never invent prices, availability or policies.
- Appointment requests: collect the caller’s name, phone number, the service they want and their preferred day and time, then confirm the details back to them and tell them the team will confirm the booking.
- Messages: take the caller’s name, phone number and a short message, and read it back to confirm.
- ${afterHours}
- When the caller has what they need, thank them and say goodbye.

# Business information
${businessFacts}

# Opening hours (${org.timezone})
${formatHours(hours)}

# Services
${formatServices(services)}

# Frequently asked questions
${faqText}${
    agent.system_prompt
      ? `

# Additional instructions from the business owner
${agent.system_prompt}`
      : ''
  }`
}

/** Full Vapi CreateAssistantDTO / UpdateAssistantDTO payload. */
export function buildAssistantPayload(src: AssistantSource, opts: { webhookUrl: string; webhookSecret: string }) {
  const { org, agent } = src
  const voiceId = (VOICES as readonly string[]).includes(agent.voice_id ?? '') ? agent.voice_id! : DEFAULT_VOICE
  const transcriberLanguage = LANGUAGES.find((l) => l.value === agent.language)?.transcriber ?? 'en-US'

  return {
    name: `${org.name} receptionist`.slice(0, 40), // Vapi limit: 40 chars
    firstMessage: agent.greeting || `Thank you for calling ${org.name}. How can I help you today?`,
    model: {
      provider: 'anthropic',
      model: CALL_MODEL,
      temperature: 0.4,
      maxTokens: MAX_TOKENS_BY_LENGTH[agent.response_length],
      messages: [{ role: 'system', content: buildSystemPrompt(src) }],
    },
    voice: { provider: 'vapi', voiceId },
    transcriber: { provider: 'deepgram', model: 'nova-3', language: transcriberLanguage },
    endCallMessage: `Thank you for calling ${org.name}. Goodbye!`,
    maxDurationSeconds: 900,
    // Call events come back to the app (call logging is handled by the webhook)
    server: { url: opts.webhookUrl, headers: { 'x-evano-secret': opts.webhookSecret } },
    serverMessages: ['end-of-call-report', 'status-update'],
    // Record calls; Vapi's own summary is off because Claude writes ours
    artifactPlan: { recordingEnabled: true },
    analysisPlan: { summaryPlan: { enabled: false } },
    // Lets the webhook map a call back to its organization — and lets us
    // verify ownership before updating an assistant
    metadata: { organizationId: org.id, agentId: agent.id, app: 'evano-ai' },
  }
}
