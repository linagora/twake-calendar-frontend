import type { ReactNode } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { AVAILABLE_LANGUAGES } from '@common/features/Settings/constants'
import { useDocumentLanguage } from '@common/hooks/useDocumentLanguage'
import {
  enGB,
  fr as frLocale,
  es as esLocale,
  de as deLocale,
  it as itLocale,
  ru as ruLocale,
  vi as viLocale
} from 'date-fns/locale'

import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import fr from '@common/locales/fr.json'
import es from '@common/locales/es.json'
import de from '@common/locales/de.json'
import it from '@common/locales/it.json'
import ru from '@common/locales/ru.json'
import vi from '@common/locales/vi.json'

const locale = { en, fr, es, de, it, ru, vi }
const dateLocales = {
  en: enGB,
  fr: frLocale,
  es: esLocale,
  de: deLocale,
  it: itLocale,
  ru: ruLocale,
  vi: viLocale
}

const SUPPORTED_LANGUAGES = AVAILABLE_LANGUAGES.map(lang => lang.code)
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const isValidLanguage = (
  lang: string | null | undefined
): lang is SupportedLanguage => {
  return !!lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
}

/**
 * The texts of the calendar in the language of the user: the one of their
 * account, of the settings, the one kept in the browser, the default of the
 * deployment, else English. Also sets the language of the document. Used by
 * App and IntentsApp.
 */
export function AppI18n({ children }: { children: ReactNode }): JSX.Element {
  const userLanguage = useAppSelector(state => state.user.coreConfig.language)
  const settingsLanguage = useAppSelector(state => state.settings.language)
  const savedLang = localStorage.getItem('lang')
  const defaultLang = window.LANG

  const lang =
    [userLanguage, settingsLanguage, savedLang, defaultLang].find(
      l => !!l && isValidLanguage(l)
    ) || 'en'

  useDocumentLanguage(lang)

  return (
    <I18n
      dictRequire={(lang: keyof typeof locale) => locale[lang]}
      lang={lang}
      locales={dateLocales}
    >
      {children}
    </I18n>
  )
}
