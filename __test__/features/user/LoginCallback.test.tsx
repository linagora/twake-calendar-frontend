// __test__/features/user/CallbackResume.test.tsx
import React from "react";
import { render, waitFor } from "@testing-library/react";
import { CallbackResume } from "../../../src/features/User/LoginCallback";
import { useAppDispatch } from "../../../src/app/hooks";
import * as oidcAuth from "../../../src/features/User/oidcAuth";
import { push } from "redux-first-history";
import {
  setTokens,
  setUserData,
  getOpenPaasUserDataAsync,
} from "../../../src/features/User/userSlice";
import { getCalendarsListAsync } from "../../../src/features/Calendars/CalendarSlice";
import { renderWithProviders } from "../../utils/Renderwithproviders";

// Mocks
jest.mock("../../../src/app/hooks", () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(() => ({})),
}));

jest.mock("../../../src/features/User/oidcAuth", () => ({
  Callback: jest.fn(),
}));

jest.mock("../../../src/features/User/userSlice", () => {
  const mockGetUser = Object.assign(
    jest.fn(() => ({ type: "GET_USER_ID" })),
    {
      pending: { type: "GET_USER_ID/pending" },
      fulfilled: { type: "GET_USER_ID/fulfilled" },
      rejected: { type: "GET_USER_ID/rejected" },
    }
  );

  return {
    setUserData: jest.fn((data) => ({ type: "SET_USER", payload: data })),
    setTokens: jest.fn((tokens) => ({ type: "SET_TOKENS", payload: tokens })),
    getOpenPaasUserDataAsync: mockGetUser,
  };
});

jest.mock("../../../src/features/Calendars/CalendarSlice", () => {
  const mockGetCalendars = Object.assign(
    jest.fn(() => ({ type: "GET_CALENDARS" })),
    {
      pending: { type: "GET_CALENDARS/pending" },
      fulfilled: { type: "GET_CALENDARS/fulfilled" },
      rejected: { type: "GET_CALENDARS/rejected" },
    }
  );

  return {
    getCalendarsListAsync: mockGetCalendars,
  };
});

describe("CallbackResume", () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
  });

  it("should call Callback and dispatch necessary actions", async () => {
    const mockTokenSet = { access_token: "abc" };
    const mockUserInfo = { name: "Test User" };

    const mockData = {
      tokenSet: mockTokenSet,
      userinfo: mockUserInfo,
    };

    (oidcAuth.Callback as jest.Mock).mockResolvedValue(mockData);

    sessionStorage.setItem(
      "redirectState",
      JSON.stringify({ code_verifier: "verifier123", state: "state456" })
    );

    render(<CallbackResume />);

    await waitFor(() => {
      expect(oidcAuth.Callback).toHaveBeenCalledWith("verifier123", "state456");
    });
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(setUserData(mockUserInfo));
    });
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(setTokens(mockTokenSet));
    });
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(getOpenPaasUserDataAsync());
    });
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(getCalendarsListAsync());
    });
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(push("/"));
    });
    await waitFor(() => {
      expect(sessionStorage.getItem("redirectState")).toBe(null);
    });
    await waitFor(() => {
      expect(sessionStorage.getItem("tokenSet")).toEqual(
        JSON.stringify(mockTokenSet)
      );
    });
  });

  it("should handle missing redirectState gracefully", async () => {
    sessionStorage.removeItem("redirectState");
    renderWithProviders(<CallbackResume />);

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(push("/"));
    });
  });
});
