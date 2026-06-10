import * as Sentry from '@sentry/react'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { Suspense, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { HistoryRouter as Router } from 'redux-first-history/rr6'
import { push } from 'redux-first-history'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { history } from '@common/app/store'
import { Error as ErrorPage } from '@common/components/Error/Error'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { ErrorBoundary } from 'react-error-boundary'
import { Loading } from '@common/components/Loading/Loading'
import { AVAILABLE_LANGUAGES } from '@common/features/Settings/constants'
import { default as CalendarLayout } from '@/components/Calendar/CalendarLayout'
import { default as HandleLogin } from '@/features/User/HandleLogin'
import { CallbackResume } from '@/features/User/LoginCallback'
import { useInitializeApp } from '@common/features/User/useInitializeApp'
import { WebSocketGate } from '@common/websocket/WebSocketGate'
import { makeCalendarOverrides } from '@common/theme/makeCalendarOverrides'

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
  const error = useAppSelector(state => state.user.error)
  const appLoading = useAppSelector(state => state.loading.isLoading)
  const userLanguage = useAppSelector(state => state.user.coreConfig.language)
  const settingsLanguage = useAppSelector(state => state.settings.language)
  const savedLang = localStorage.getItem('lang')
  const defaultLang = window.LANG

  const lang =
    [userLanguage, settingsLanguage, savedLang, defaultLang].find(
      l => !!l && isValidLanguage(l)
    ) || 'en'

  const dispatch = useAppDispatch()
  useEffect(() => {
    if (error) {
      dispatch(push('/error'))
    }
  }, [error, dispatch])

  useInitializeApp()

  return (
    <TwakeMuiThemeProvider
      themeOptions={{
        ...makeCalendarOverrides()
      }}
    >
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
            <WebSocketGate />
            <Router history={history}>
              <Routes>
                <Route path="/" element={<HandleLogin />} />
                <Route path="/calendar" element={<CalendarLayout />} />
                <Route path="/callback" element={<CallbackResume />} />
                <Route path="/error" element={<ErrorPage />} />
              </Routes>
            </Router>
            <ErrorSnackbar error={error} type="user" />
          </Suspense>
          {appLoading && <Loading />}
        </ErrorBoundary>
      </I18n>
    </TwakeMuiThemeProvider>
  )
}
