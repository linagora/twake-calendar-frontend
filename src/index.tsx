import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./app/store";
import { theme } from "twake-mui";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";

const container = document.getElementById("root")!;

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
      <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
