import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { HistoryRouter as Router } from "redux-first-history/rr6";
import { Menubar } from "./components/Menubar/Menubar";
import { CallbackResume } from "./features/User/LoginCallback";
import { history } from "./app/store";
import "./App.css";
import { Loading } from "./components/Loading/Loading";
import HandleLogin from "./features/User/HandleLogin";
import CalendarApp from "./components/Calendar/Calendar";
import { Error } from "./components/Error/Error";
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Router history={history}>
        <Routes>
          <Route path="/" element={<HandleLogin />} />
          <Route
            path="/calendar"
            element={
              <div className="App">
                <Menubar />
                <CalendarApp />
              </div>
            }
          />
          <Route path="/callback" element={<CallbackResume />} />
          <Route path="/error" element={<Error />} />
        </Routes>
      </Router>
    </Suspense>
  );
}

export default App;
