// =============================================================================
// AI Receptionist settings — options shared by the form and the server action
// Values match the CHECK constraints on public.ai_agents.
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

export const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'ru-RU', label: 'Russian' },
  { value: 'tr-TR', label: 'Turkish' },
  { value: 'de-DE', label: 'German' },
  { value: 'fr-FR', label: 'French' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'ar-SA', label: 'Arabic' },
] as const

export type Tone = (typeof TONES)[number]['value']
export type ResponseLength = (typeof RESPONSE_LENGTHS)[number]['value']

export const LIMITS = {
  name: 100,
  greeting: 300,
  instructions: 4000,
} as const
