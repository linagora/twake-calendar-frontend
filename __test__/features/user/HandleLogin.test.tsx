import * as appHooks from "@/app/hooks";
import { AppDispatch } from "@/app/store";
import HandleLogin from "@/features/User/HandleLogin";
import * as oidcAuth from "@/features/User/oidcAuth";
import { clientConfig } from "@/features/User/oidcAuth";
import * as apiUtils from "@/utils/apiUtils";
import { screen, waitFor } from "@testing-library/react";
import { push } from "redux-first-history";
import { renderWithProviders } from "../../utils/Renderwithproviders";

clientConfig.url = "https://example.com";

describe("HandleLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(apiUtils, "redirectTo").mockImplementation(() => {});
    const dispatch = jest.fn() as AppDispatch;
    jest.spyOn(appHooks, "useAppDispatch").mockReturnValue(dispatch);
    sessionStorage.clear();
  });

  test("redirects and sets sessionStorage when no userData", async () => {
    const loginUrlMock = {
      code_verifier: "verifier123",
      state: "state123",
      redirectTo: new URL("http://login.url"),
    };

    jest.spyOn(oidcAuth, "Auth").mockResolvedValue(loginUrlMock);

    renderWithProviders(<HandleLogin />, {
      user: {
        userData: null,
        tokens: null,
        loading: false,
        error: null,
      },
      calendars: {
        list: {},
        pending: false,
        error: null,
      },
    });

    await waitFor(
      () => {
        expect(oidcAuth.Auth).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    await waitFor(
      () => {
        expect(sessionStorage.getItem("redirectState")).toEqual(
          JSON.stringify({
            code_verifier: "verifier123",
            state: "state123",
          })
        );
      },
      { timeout: 3000 }
    );

    await waitFor(
      () => {
        expect(apiUtils.redirectTo).toHaveBeenCalledWith(
          loginUrlMock.redirectTo
        );
      },
      { timeout: 3000 }
    );
  });

  test("does not render loading element when userData exists and calendars pending is true", () => {
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          sid: "aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro",
          openpaasId: "667037022b752d0026472254",
        },
        tokens: { access_token: "test" },
        loading: false,
      },
      calendars: { list: {}, pending: true },
      loading: { isLoading: true },
    };

    renderWithProviders(<HandleLogin />, preloadedState);
    // HandleLogin now returns null, loading is shown at App level via appLoading state
    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
  });
  test("does not render loading element when userData exists and calendars pending is false", () => {
    const preloadedState = {
      user: {
        userData: {
          sub: "cmoussu",
          email: "cmoussu@linagora.com",
          sid: "aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro",
          openpaasId: "667037022b752d0026472254",
        },
        tokens: { access_token: "test" },
        loading: false,
      },
      calendars: { list: {}, pending: false },
      loading: { isLoading: false },
    };
    renderWithProviders(<HandleLogin />, preloadedState);

    // HandleLogin now returns null, loading is shown at App level via appLoading state
    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
  });
  test("goes to error page when there is error in user data", async () => {
    const mockDispatch = jest.fn();
    jest.spyOn(appHooks, "useAppDispatch").mockReturnValue(mockDispatch);
    jest.spyOn(oidcAuth, "Auth").mockResolvedValue({
      code_verifier: "verifier123",
      state: "state123",
      redirectTo: new URL("http://login.url"),
    });

    renderWithProviders(<HandleLogin />, {
      user: {
        error: true,
        loading: false,
        userData: {
          sub: "test",
          email: "test@test.com",
          sid: "testSid",
          openpaasId: "testId",
        },
        tokens: { access_token: "test" },
      },
      calendars: {
        list: {},
        pending: false,
        error: null,
      },
    });

    await waitFor(
      () => {
        expect(mockDispatch).toHaveBeenCalledWith(push("/error"));
      },
      { timeout: 3000 }
    );
  });
});
