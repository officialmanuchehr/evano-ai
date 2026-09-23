// =============================================================================
// AI Receptionist settings — options shared by the form, server actions and
// the Vapi assistant builder. Values match the CHECK constraints on
// public.ai_agents. Every voice/transcriber value below was verified to be
// accepted by the Vapi API (2026-09-23).
// =============================================================================

export const TONES = [
  { value: 'professional', label: 'Professional', description: 'Polite, precise and to the point' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and welcoming, like a great front desk' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
] as const

export const RESPONSE_LENGTHS = [
  { value: 'short', label: 'Short' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
] as const

// Speech recognition (Deepgram) per language. English uses Nova-3; the others
// use Nova-2, which has long-standing support for these languages.
// The bilingual option uses Flux Multilingual limited to Russian + English —
// in a side-by-side test (2026-09-23) Nova-3 "multi" drifted into Portuguese and
// Hindi on noise, while Flux kept clean RU/EN turns.
type Transcriber = { model: string; language?: string; languages?: string[] }

export const LANGUAGES: readonly { value: string; label: string; transcriber: Transcriber }[] = [
  { value: 'en-US', label: 'English (US)', transcriber: { model: 'nova-3', language: 'en-US' } },
  { value: 'en-GB', label: 'English (UK)', transcriber: { model: 'nova-3', language: 'en-GB' } },
  { value: 'ru-RU', label: 'Russian — Русский', transcriber: { model: 'nova-2', language: 'ru' } },
  // Bilingual: understands Russian and English in the same call and answers in the caller's language
  { value: 'multi-ru-en', label: 'Russian + English (auto) — Русский + английский', transcriber: { model: 'flux-general-multi', languages: ['ru', 'en'] } },
  { value: 'tr-TR', label: 'Turkish', transcriber: { model: 'nova-2', language: 'tr' } },
  { value: 'de-DE', label: 'German', transcriber: { model: 'nova-2', language: 'de' } },
  { value: 'fr-FR', label: 'French', transcriber: { model: 'nova-2', language: 'fr' } },
  { value: 'es-ES', label: 'Spanish', transcriber: { model: 'nova-2', language: 'es' } },
  { value: 'ar-SA', label: 'Arabic', transcriber: { model: 'nova-3', language: 'ar' } },
]

export type LanguageCode = 'en-US' | 'en-GB' | 'ru-RU' | 'multi-ru-en' | 'tr-TR' | 'de-DE' | 'fr-FR' | 'es-ES' | 'ar-SA'

// ------------------------------------------------------------------ voices

type VoiceOption = { id: string; label: string; provider: 'vapi' | 'azure'; voiceId: string; languages: readonly string[] }

// Built-in Vapi voices (English)
const VAPI_ENGLISH = [
  'Clara', 'Elliot', 'Rohan', 'Savannah', 'Leah', 'Tara', 'Jess', 'Leo', 'Dan',
  'Mia', 'Zac', 'Zoe', 'Godfrey', 'Emma', 'Nico', 'Kai', 'Sagar', 'Neil',
].map((name) => ({ id: name, label: name, provider: 'vapi' as const, voiceId: name, languages: ['en-US', 'en-GB'] }))

// Native Microsoft (Azure) neural voices for the other languages
const azure = (voiceId: string, label: string, language: LanguageCode): VoiceOption => ({
  id: `azure:${voiceId}`,
  label,
  provider: 'azure',
  voiceId,
  languages: [language],
})

export const VOICE_OPTIONS: readonly VoiceOption[] = [
  ...VAPI_ENGLISH,
  // Multilingual neural voices — natural in both Russian and English
  azure('en-US-AvaMultilingualNeural', 'Ava (female)', 'multi-ru-en'),
  azure('en-US-EmmaMultilingualNeural', 'Emma (female)', 'multi-ru-en'),
  azure('en-US-AndrewMultilingualNeural', 'Andrew (male)', 'multi-ru-en'),
  azure('en-US-BrianMultilingualNeural', 'Brian (male)', 'multi-ru-en'),
  azure('ru-RU-SvetlanaNeural', 'Svetlana (female)', 'ru-RU'),
  azure('ru-RU-DariyaNeural', 'Dariya (female)', 'ru-RU'),
  azure('ru-RU-DmitryNeural', 'Dmitry (male)', 'ru-RU'),
  azure('tr-TR-EmelNeural', 'Emel (female)', 'tr-TR'),
  azure('tr-TR-AhmetNeural', 'Ahmet (male)', 'tr-TR'),
  azure('de-DE-KatjaNeural', 'Katja (female)', 'de-DE'),
  azure('de-DE-ConradNeural', 'Conrad (male)', 'de-DE'),
  azure('fr-FR-DeniseNeural', 'Denise (female)', 'fr-FR'),
  azure('fr-FR-HenriNeural', 'Henri (male)', 'fr-FR'),
  azure('es-ES-ElviraNeural', 'Elvira (female)', 'es-ES'),
  azure('es-ES-AlvaroNeural', 'Álvaro (male)', 'es-ES'),
  azure('ar-SA-ZariyahNeural', 'Zariyah (female)', 'ar-SA'),
  azure('ar-SA-HamedNeural', 'Hamed (male)', 'ar-SA'),
]

export const DEFAULT_VOICE = 'Clara'

export function voicesFor(language: string) {
  return VOICE_OPTIONS.filter((v) => v.languages.includes(language))
}

/** A voice that suits `language` — the saved one if it fits, else the language's first. */
export function resolveVoice(voiceId: string | null | undefined, language: string): VoiceOption {
  const options = voicesFor(language)
  return options.find((v) => v.id === voiceId) ?? options[0] ?? VOICE_OPTIONS.find((v) => v.id === DEFAULT_VOICE)!
}

// --------------------------------------------------------------- greetings

const GREETINGS: Record<string, (business: string) => string> = {
  'en-US': (b) => `Thank you for calling ${b}. How can I help you today?`,
  'en-GB': (b) => `Thank you for calling ${b}. How can I help you today?`,
  'ru-RU': (b) => `Здравствуйте! Вы позвонили в ${b}. Чем могу помочь?`,
  'multi-ru-en': (b) => `Здравствуйте! Вы позвонили в ${b}. Чем могу помочь?`,
  'tr-TR': (b) => `${b}'ı aradığınız için teşekkürler. Size nasıl yardımcı olabilirim?`,
  'de-DE': (b) => `Vielen Dank für Ihren Anruf bei ${b}. Wie kann ich Ihnen helfen?`,
  'fr-FR': (b) => `Merci d'avoir appelé ${b}. Comment puis-je vous aider ?`,
  'es-ES': (b) => `Gracias por llamar a ${b}. ¿En qué puedo ayudarle?`,
  'ar-SA': (b) => `شكراً لاتصالك بـ ${b}. كيف يمكنني مساعدتك؟`,
}

const GOODBYES: Record<string, (business: string) => string> = {
  'ru-RU': (b) => `Спасибо, что позвонили в ${b}. До свидания!`,
  'multi-ru-en': (b) => `Спасибо, что позвонили в ${b}. До свидания!`,
  'tr-TR': (b) => `${b}'ı aradığınız için teşekkürler. İyi günler!`,
  'de-DE': (b) => `Vielen Dank für Ihren Anruf bei ${b}. Auf Wiederhören!`,
  'fr-FR': (b) => `Merci d'avoir appelé ${b}. Au revoir !`,
  'es-ES': (b) => `Gracias por llamar a ${b}. ¡Hasta luego!`,
  'ar-SA': (b) => `شكراً لاتصالك بـ ${b}. مع السلامة!`,
}

export function defaultGreeting(language: string, business: string) {
  return (GREETINGS[language] ?? GREETINGS['en-US'])(business)
}

export function goodbyeMessage(language: string, business: string) {
  return (GOODBYES[language] ?? ((b: string) => `Thank you for calling ${b}. Goodbye!`))(business)
}

/** True when `greeting` is one of the auto-generated defaults (safe to replace on language change). */
export function isDefaultGreeting(greeting: string, business: string) {
  return Object.values(GREETINGS).some((g) => g(business) === greeting.trim())
}

// ------------------------------------------------------------------- model

// Model that runs the conversation inside Vapi (chosen for low latency on calls).
// Vapi's Anthropic model enum uses the dated ID.
export const CALL_MODEL = 'claude-haiku-4-5-20251001'

// Upper bound on each spoken reply, by answer-length setting
export const MAX_TOKENS_BY_LENGTH = { short: 150, balanced: 250, detailed: 400 } as const

export type Tone = (typeof TONES)[number]['value']
export type ResponseLength = (typeof RESPONSE_LENGTHS)[number]['value']

export const LIMITS = {
  name: 100,
  greeting: 300,
  instructions: 4000,
} as const
