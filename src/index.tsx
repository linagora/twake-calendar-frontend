import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./app/store";
import { BreakpointsProvider } from "cozy-ui/transpiled/react/providers/Breakpoints";
import CozyTheme from "cozy-ui/transpiled/react/providers/CozyTheme";
import { I18n } from "cozy-ui/transpiled/react/providers/I18n";
import reportWebVitals from "./reportWebVitals";
const container = document.getElementById("root")!;

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <I18n>
      <CozyTheme ignoreCozySettings={undefined}>
        <BreakpointsProvider>
          <Provider store={store}>
            <App />
          </Provider>
        </BreakpointsProvider>
      </CozyTheme>
    </I18n>
  </React.StrictMode>
);

reportWebVitals();
