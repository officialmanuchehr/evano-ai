// =============================================================================
// i18n configuration — interface languages (separate from the receptionist's
// call language, which is set per business in AI Receptionist settings)
// =============================================================================

export const LOCALES = ['en', 'ru'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'evano_locale'

export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', ru: 'Русский' }

/** BCP-47 tag used for date/number formatting */
export const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', ru: 'ru-RU' }

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** Pick a supported locale from an Accept-Language header ("ru-RU,ru;q=0.9,en;q=0.8"). */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE
  for (const part of header.split(',')) {
    const lang = part.split(';')[0].trim().slice(0, 2).toLowerCase()
    if (isLocale(lang)) return lang
  }
  return DEFAULT_LOCALE
}

/** Replace {name} placeholders. */
export function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}
