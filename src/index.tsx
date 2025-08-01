import 'cozy-ui/transpiled/react/stylesheet.css';
import 'cozy-ui/dist/cozy-ui.utils.min.css';

import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./app/store";

import CozyTheme from "cozy-ui/transpiled/react/providers/CozyTheme";
import { I18n } from "cozy-ui/transpiled/react/providers/I18n";
import { BreakpointsProvider } from "cozy-ui/transpiled/react/providers/Breakpoints";

const container = document.getElementById("root")!;

const locale = 'fr';

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <I18n lang={locale} dictRequire={() => require(`./locales/${locale}`)}>
      <CozyTheme ignoreCozySettings={true}>
        <BreakpointsProvider>
          <Provider store={store}>
            <App />
           </Provider>
        </BreakpointsProvider>
      </CozyTheme>
    </I18n>
  </React.StrictMode>
);
