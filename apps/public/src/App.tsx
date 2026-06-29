import * as Sentry from '@sentry/react'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { Suspense, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { HistoryRouter as Router } from 'redux-first-history/rr6'
import { history } from '@common/app/store'
import { Error as ErrorPage } from '@common/components/Error/Error'
import { ErrorBoundary } from 'react-error-boundary'
import { Loading } from '@common/components/Loading/Loading'
import { PublicLayout } from './components/PublicLayout'
import { EventPreviewPage } from './features/EventPreview/EventPreviewPage'
import { BookingPage } from './features/booking/BookingPage'

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
import {
  PublicLanguageContext,
  getDefaultLanguage,
  SupportedLanguage
} from './context/PublicLanguageContext'

const locale = { en, fr, ru, vi }
const dateLocales = { en: enGB, fr: frLocale, ru: ruLocale, vi: viLocale }

export default function App(): JSX.Element {
  const [lang, setLang] = useState<SupportedLanguage>(getDefaultLanguage)

  const handleLanguageChange = (newLang: SupportedLanguage): void => {
    localStorage.setItem('lang', newLang)
    setLang(newLang)
  }

  return (
    <TwakeMuiThemeProvider>
      <I18n
        dictRequire={(lang: keyof typeof locale) => locale[lang]}
        lang={lang}
        locales={dateLocales}
      >
        <PublicLanguageContext.Provider
          value={{
            currentLanguage: lang,
            setCurrentLanguage: handleLanguageChange
          }}
        >
          <ErrorBoundary
            FallbackComponent={({ error }) => (
              <ErrorPage
                isCrashFallback
                errorBoundaryMessage={error as Error}
              />
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
                  <Route
                    path="/excal"
                    element={
                      <PublicLayout>
                        <EventPreviewPage />
                      </PublicLayout>
                    }
                  />
                  <Route
                    path="/booking/:bookingLinkPublicId"
                    element={
                      <PublicLayout>
                        <BookingPage />
                      </PublicLayout>
                    }
                  />
                </Routes>
              </Router>
            </Suspense>
          </ErrorBoundary>
        </PublicLanguageContext.Provider>
      </I18n>
    </TwakeMuiThemeProvider>
  )
}
