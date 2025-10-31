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
import { CustomThemeProvider } from "./theme/ThemeProvider";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { push } from "redux-first-history";
import { ErrorSnackbar } from "./components/Error/ErrorSnackbar";
import I18n from "cozy-ui/transpiled/react/providers/I18n";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

const locale = { en, fr };
const lang = (window as any).LANG ?? "en";

function App() {
  const error = useAppSelector((state) => state.user.error);
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (error) {
      dispatch(push("/error"));
    }
  });

  return (
    <CustomThemeProvider>
      <I18n
        dictRequire={(lang: keyof typeof locale) => locale[lang]}
        lang={lang}
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
          <ErrorSnackbar error={error} type="user" />
        </Suspense>
      </I18n>
    </CustomThemeProvider>
  );
}

export default App;
