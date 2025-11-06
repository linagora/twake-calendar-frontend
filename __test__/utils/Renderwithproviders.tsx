import type { RenderOptions } from "@testing-library/react";
import { render } from "@testing-library/react";
import { I18nContext } from "cozy-ui/transpiled/react/providers/I18n";
import React, { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import type { AppStore, RootState } from "../../src/app/store";
import { setupStore } from "../../src/app/store";
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
      <I18nContext.Provider
        value={{
          t: (key: string, vars?: Record<string, string>) => {
            if (vars) {
              const params = Object.entries(vars)
                .map(([k, v]) => `${k}=${v}`)
                .join(",");
              return `${key}(${params})`;
            }
            return key;
          },
          f: (date: Date, formatStr: string) => date.toString(),
        }}
      >
        <MemoryRouter initialEntries={["/"]}>
          <Provider store={store}>{children}</Provider>
        </MemoryRouter>
      </I18nContext.Provider>
    );
  };

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
