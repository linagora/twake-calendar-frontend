import type { RenderOptions } from "@testing-library/react";
import { render } from "@testing-library/react";
import React, { PropsWithChildren } from "react";
import { Provider } from "react-redux";

import { MemoryRouter } from "react-router-dom";
import type { AppStore, RootState } from "../../src/app/store";
import { setupStore } from "../../src/app/store";
import { userData, userOrganiser } from "../../src/features/User/userDataTypes";

interface ExtendedRenderOptions extends Omit<RenderOptions, "queries"> {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
}

export function renderWithProviders(
  ui: React.ReactElement,
  preloadedState = {},
  extendedRenderOptions: ExtendedRenderOptions = {}
) {
  const { store = setupStore(preloadedState), ...renderOptions } =
    extendedRenderOptions;

  const Wrapper = ({ children }: PropsWithChildren) => {
    return (
      <MemoryRouter initialEntries={["/"]}>
        <Provider store={store}>{children}</Provider>
      </MemoryRouter>
    );
  };

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
