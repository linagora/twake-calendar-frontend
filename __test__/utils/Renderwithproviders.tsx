import type { RenderOptions } from "@testing-library/react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React, { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { Provider } from "react-redux";
import "../i18n";

import { MemoryRouter } from "react-router-dom";
import type { AppStore, RootState } from "../../src/app/store";
import { setupStore } from "../../src/app/store";
import { t } from "i18next";
import { userData } from "../../src/features/User/userDataTypes";

interface ExtendedRenderOptions extends Omit<RenderOptions, "queries"> {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
}

export function renderWithProviders(
  ui: React.ReactElement,
  extendedRenderOptions: ExtendedRenderOptions = {}
) {
  const {
    preloadedState = {
      user: { userData: null as unknown as userData },
      router: {
        location: {
          pathname: "",
          search: "",
          hash: "",
          state: null,
          key: "o01z0jry",
        },
      },
    },

    store = setupStore(preloadedState),
    ...renderOptions
  } = extendedRenderOptions;

  const Wrapper = ({ children }: PropsWithChildren) => {
    useTranslation();
    return (
      <MemoryRouter initialEntries={["/manager.html"]}>
        <Provider store={store}>{children}</Provider>
      </MemoryRouter>
    );
  };

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
