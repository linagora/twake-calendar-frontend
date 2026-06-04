import * as Sentry from '@sentry/react'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { HistoryRouter as Router } from 'redux-first-history/rr6'
import { history } from '@common/app/store'
import { Error as ErrorPage } from '@common/components/Error/Error'
import { ErrorBoundary } from 'react-error-boundary'
import { Loading } from '@common/components/Loading/Loading'
import { AVAILABLE_LANGUAGES } from '@common/features/Settings/constants'

import {
  enGB,
  fr as frLocale,
  ru as ruLocale,
  vi as viLocale
} from 'date-fns/locale'

import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import fr from '@common/locales/fr.json'
import ru from '@common/locales/ru.json'
import vi from '@common/locales/vi.json'

const locale = { en, fr, ru, vi }
const dateLocales = { en: enGB, fr: frLocale, ru: ruLocale, vi: viLocale }

const SUPPORTED_LANGUAGES = AVAILABLE_LANGUAGES.map(lang => lang.code)
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const isValidLanguage = (
  lang: string | null | undefined
): lang is SupportedLanguage => {
  return !!lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
}

export default function App(): JSX.Element {
  const savedLang = localStorage.getItem('lang')
  const defaultLang = window.LANG

  const lang =
    [savedLang, defaultLang].find(l => !!l && isValidLanguage(l)) || 'en'

  return (
    <TwakeMuiThemeProvider>
      {/* @ts-expect-error - twake-i18n types are incompatible with React 18 */}
      <I18n
        dictRequire={(lang: keyof typeof locale) => locale[lang]}
        lang={lang}
        locales={dateLocales}
      >
        <ErrorBoundary
          FallbackComponent={({ error }) => (
            <ErrorPage isCrashFallback errorBoundaryMessage={error as Error} />
          )}
          onError={(error, errorInfo) => {
            Sentry.captureException(error, {
              contexts: {
                react: {
                  componentStack: errorInfo.componentStack
                }
              }
            })
          }}
        >
          <Suspense fallback={<Loading />}>
            <Router history={history}>
              <Routes>
                <Route path="*" element={<div>Public Calendar App</div>} />
              </Routes>
            </Router>
          </Suspense>
        </ErrorBoundary>
      </I18n>
    </TwakeMuiThemeProvider>
  )
}
