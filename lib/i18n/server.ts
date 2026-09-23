import 'server-only'

import { cookies, headers } from 'next/headers'
import { en, type Dictionary } from '@/lib/i18n/dictionaries/en'
import { ru } from '@/lib/i18n/dictionaries/ru'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, type Locale } from '@/lib/i18n/config'

// =============================================================================
// Server-side i18n: locale = cookie, else browser Accept-Language, else English
// =============================================================================

const DICTIONARIES: Record<Locale, Dictionary> = { en, ru }

export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie
  return localeFromAcceptLanguage((await headers()).get('accept-language')) ?? DEFAULT_LOCALE
}

export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

/** Current locale + its dictionary, for Server Components and Server Actions. */
export async function getI18n() {
  const locale = await getLocale()
  return { locale, t: DICTIONARIES[locale] }
}
