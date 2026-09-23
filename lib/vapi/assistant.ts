import { CALL_MODEL, LANGUAGES, MAX_TOKENS_BY_LENGTH, defaultGreeting, goodbyeMessage, resolveVoice } from '@/lib/agent/constants'
import { WEEK_DAYS, type ServiceItem } from '@/lib/onboarding/constants'
import type { AiAgent, BusinessHour, BusinessInfo, Faq, Organization } from '@/types/database'
import { bookingTools } from '@/lib/vapi/tools'

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
  const languageRule =
    agent.language === 'multi-ru-en'
      ? 'Callers speak Russian or English. Always reply in the language of the caller’s most recent message, and switch immediately if they switch. If unsure, use Russian.'
      : `Speak ${language} unless the caller clearly prefers another language.`

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
- ${languageRule} Tool results and the business information below may be in English — always translate them naturally when you speak.

# What you can help with
- Answer questions using only the business information below. If you do not know something, say so honestly and offer to take a message — never invent prices, availability or policies.
- Appointments: ask which service and day the caller wants, then call check_availability and offer two or three of the free times. Never offer or confirm a time without checking. When they choose, collect their name (and phone number if different from the one they are calling from), read the details back, then call book_appointment. Only say the appointment is booked if book_appointment confirms it.
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
  const voice = resolveVoice(agent.voice_id, agent.language)
  const transcriber = LANGUAGES.find((l) => l.value === agent.language)?.transcriber ?? LANGUAGES[0].transcriber

  return {
    name: `${org.name} receptionist`.slice(0, 40), // Vapi limit: 40 chars
    firstMessage: agent.greeting || defaultGreeting(agent.language, org.name),
    model: {
      provider: 'anthropic',
      model: CALL_MODEL,
      temperature: 0.4,
      maxTokens: MAX_TOKENS_BY_LENGTH[agent.response_length],
      messages: [{ role: 'system', content: buildSystemPrompt(src) }],
      tools: bookingTools({ url: opts.webhookUrl, headers: { 'x-evano-secret': opts.webhookSecret } }),
    },
    voice: { provider: voice.provider, voiceId: voice.voiceId },
    transcriber: { provider: 'deepgram', model: transcriber.model, language: transcriber.language },
    endCallMessage: goodbyeMessage(agent.language, org.name),
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
