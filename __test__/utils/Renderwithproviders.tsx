import type { RenderOptions } from "@testing-library/react";
import { render } from "@testing-library/react";
import React, { PropsWithChildren } from "react";
import { Provider } from "react-redux";

import { I18n } from "cozy-ui/transpiled/react/providers/I18n";
import { MemoryRouter } from "react-router-dom";
import type { AppStore, RootState } from "../../src/app/store";
import { setupStore } from "../../src/app/store";
import { userData, userOrganiser } from "../../src/features/User/userDataTypes";
import enLocale from '../../src/locales/en.json'

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
        <I18n lang="en" dictRequire={() => enLocale}>
          <Provider store={store}>{children}</Provider>
        </I18n>
      </MemoryRouter>
    );
  };

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
