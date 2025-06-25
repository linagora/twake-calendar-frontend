import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { HistoryRouter as Router } from "redux-first-history/rr6";
import { Menubar } from "./components/Menubar/Menubar";
import { CallbackResume } from "./features/User/LoginCallback";
import { history } from "./app/store";
import './App.css'
function App() {
  return (
    <Suspense fallback="loading">
      <Router history={history}>
        <Routes>
          <Route
            path="/"
            element={
              <div className="App">
                <header className="App-header">
                  <Menubar />
                </header>
              </div>
            }
          />
          <Route path="/callback" element={<CallbackResume />} />
        </Routes>
      </Router>
    </Suspense>
  );
}

export default App;
