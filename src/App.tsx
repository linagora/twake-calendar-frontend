import { TwakeMuiThemeProvider } from "@linagora/twake-mui";
import { Suspense, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { push } from "redux-first-history";
import { HistoryRouter as Router } from "redux-first-history/rr6";
import "./App.styl";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { history } from "./app/store";
import CalendarLayout from "./components/Calendar/CalendarLayout";
import { Error as ErrorPage } from "./components/Error/Error";
import { ErrorSnackbar } from "./components/Error/ErrorSnackbar";
import { Loading } from "./components/Loading/Loading";
import { AVAILABLE_LANGUAGES } from "./features/Settings/constants";
import HandleLogin from "./features/User/HandleLogin";
import { CallbackResume } from "./features/User/LoginCallback";
import { WebSocketGate } from "./websocket/WebSocketGate";

import {
  enGB,
  fr as frLocale,
  ru as ruLocale,
  vi as viLocale,
} from "date-fns/locale";

import I18n from "twake-i18n";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ru from "./locales/ru.json";
import vi from "./locales/vi.json";

const locale = { en, fr, ru, vi };
const dateLocales = { en: enGB, fr: frLocale, ru: ruLocale, vi: viLocale };

const SUPPORTED_LANGUAGES = AVAILABLE_LANGUAGES.map((lang) => lang.code);
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const isValidLanguage = (
  lang: string | null | undefined
): lang is SupportedLanguage => {
  return !!lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
};

function App() {
  const error = useAppSelector((state) => state.user.error);
  const userLanguage = useAppSelector(
    (state) => state.user.coreConfig.language
  );
  const settingsLanguage = useAppSelector((state) => state.settings.language);
  const savedLang = localStorage.getItem("lang");
  const defaultLang = (window as any).LANG;

  const lang =
    [userLanguage, settingsLanguage, savedLang, defaultLang].find(
      (l) => !!l && isValidLanguage(l)
    ) || "en";

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (error) {
      dispatch(push("/error"));
    }
  }, [error, dispatch]);

  return (
    <TwakeMuiThemeProvider>
      <I18n
        dictRequire={(lang: keyof typeof locale) => locale[lang]}
        lang={lang}
        locales={dateLocales}
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
      </I18n>
    </TwakeMuiThemeProvider>
  );
}

export default App;
