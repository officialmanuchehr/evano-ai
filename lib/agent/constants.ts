// =============================================================================
// AI Receptionist settings — options shared by the form, server actions and
// the Vapi assistant builder. Values match the CHECK constraints on
// public.ai_agents.
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

// `transcriber` = Deepgram language code (verified against Vapi's API schema)
export const LANGUAGES = [
  { value: 'en-US', label: 'English (US)', transcriber: 'en-US' },
  { value: 'en-GB', label: 'English (UK)', transcriber: 'en-GB' },
  { value: 'ru-RU', label: 'Russian', transcriber: 'ru' },
  { value: 'tr-TR', label: 'Turkish', transcriber: 'tr' },
  { value: 'de-DE', label: 'German', transcriber: 'de' },
  { value: 'fr-FR', label: 'French', transcriber: 'fr' },
  { value: 'es-ES', label: 'Spanish', transcriber: 'es' },
  { value: 'ar-SA', label: 'Arabic', transcriber: 'ar' },
] as const

// Built-in Vapi voices — each verified to be accepted by the Vapi API (2026-09-23)
export const VOICES = [
  'Clara', 'Elliot', 'Rohan', 'Savannah', 'Leah', 'Tara', 'Jess', 'Leo', 'Dan',
  'Mia', 'Zac', 'Zoe', 'Godfrey', 'Emma', 'Nico', 'Kai', 'Sagar', 'Neil',
] as const

export const DEFAULT_VOICE: (typeof VOICES)[number] = 'Clara'

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
