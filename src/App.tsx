import { Suspense, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { HistoryRouter as Router } from "redux-first-history/rr6";
import { CallbackResume } from "./features/User/LoginCallback";
import { history } from "./app/store";
import "./App.styl";
import { Loading } from "./components/Loading/Loading";
import HandleLogin from "./features/User/HandleLogin";
import CalendarLayout from "./components/Calendar/CalendarLayout";
import { Error } from "./components/Error/Error";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { push } from "redux-first-history";
import { ErrorSnackbar } from "./components/Error/ErrorSnackbar";
import { AVAILABLE_LANGUAGES } from "./features/Settings/constants";
import { useTheme } from "@mui/material/styles";

import {
  enGB,
  fr as frLocale,
  ru as ruLocale,
  vi as viLocale,
} from "date-fns/locale";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ru from "./locales/ru.json";
import vi from "./locales/vi.json";
import I18n from "twake-i18n";

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
  const theme = useTheme();
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
      <I18n
        dictRequire={(lang: keyof typeof locale) => locale[lang]}
        lang={lang}
        locales={dateLocales}
      >
        <Suspense fallback={<Loading />}>
          <Router history={history}>
            <Routes>
              <Route path="/" element={<HandleLogin />} />
              <Route path="/calendar" element={<CalendarLayout />} />
              <Route path="/callback" element={<CallbackResume />} />
              <Route path="/error" element={<Error />} />
            </Routes>
          </Router>
          <ErrorSnackbar error={error} type="user" />
        </Suspense>
      </I18n>
  );
}

export default App;
