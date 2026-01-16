import { screen, waitFor } from "@testing-library/react";
import thunk, { ThunkDispatch } from "redux-thunk";
import HandleLogin from "../../../src/features/User/HandleLogin";
import * as oidcAuth from "../../../src/features/User/oidcAuth";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import { clientConfig } from "../../../src/features/User/oidcAuth";
import * as apiUtils from "../../../src/utils/apiUtils";
import * as appHooks from "../../../src/app/hooks";
import { push } from "redux-first-history";

clientConfig.url = "https://example.com";

describe("HandleLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(apiUtils, "redirectTo").mockImplementation(() => {});
    const dispatch = jest.fn() as ThunkDispatch<any, any, any>;
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

    renderWithProviders(<HandleLogin />);

    await waitFor(() => {
      expect(oidcAuth.Auth).toHaveBeenCalled();
      expect(sessionStorage.getItem("redirectState")).toEqual(
        JSON.stringify({
          code_verifier: "verifier123",
          state: "state123",
        })
      );
      expect(apiUtils.redirectTo).toHaveBeenCalledWith(loginUrlMock.redirectTo);
    });
  });

  test("shows Loading when userData exists and calendars pending is true", () => {
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          sid: "aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro",
          openpaasId: "667037022b752d0026472254",
        },
      },
      calendars: { list: {}, pending: true },
    };

    renderWithProviders(<HandleLogin />, preloadedState);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });
  test("shows Loading when userData exists and calendars pending is false", () => {
    const preloadedState = {
      user: {
        userData: {
          sub: "cmoussu",
          email: "cmoussu@linagora.com",
          sid: "aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    renderWithProviders(<HandleLogin />, preloadedState);

    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });
  test("goes to error page when there is error in user data", () => {
    const dispatch = appHooks.useAppDispatch();
    renderWithProviders(<HandleLogin />, { user: { error: true } });
    expect(dispatch).toHaveBeenCalledWith(push("/error"));
  });
});
