import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { HistoryRouter as Router } from "redux-first-history/rr6";
import { CallbackResume } from "./features/User/LoginCallback";
import { history } from "./app/store";
import "./App.css";
import { Loading } from "./components/Loading/Loading";
import HandleLogin from "./features/User/HandleLogin";
import CalendarLayout from "./components/Calendar/CalendarLayout";
import { Error } from "./components/Error/Error";
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Router history={history}>
        <Routes>
          <Route path="/" element={<HandleLogin />} />
          <Route path="/calendar" element={<CalendarLayout />} />
          <Route path="/callback" element={<CallbackResume />} />
          <Route path="/error" element={<Error />} />
        </Routes>
      </Router>
    </Suspense>
  );
}

export default App;
