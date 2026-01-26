import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { getCalendarsListAsync } from "@/features/Calendars/services/getCalendarsListAsync";
import { CallbackResume } from "@/features/User/LoginCallback";
import * as oidcAuth from "@/features/User/oidcAuth";
import {
  getOpenPaasUserDataAsync,
  setTokens,
  setUserData,
} from "@/features/User/userSlice";
import { render, waitFor } from "@testing-library/react";
import { replace } from "redux-first-history";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import { setAppLoading } from "@/app/loadingSlice";

// Mocks
jest.mock("@/app/hooks", () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(() => ({
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
  })),
}));

jest.mock("@/features/User/oidcAuth", () => ({
  Callback: jest.fn(),
}));

jest.mock("@/features/User/userSlice", () => {
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

jest.mock("@/features/Calendars/services/getCalendarsListAsync", () => {
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
  let mockUserState: any;
  let mockCalendarsState: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppDispatch as unknown as jest.Mock).mockReturnValue(dispatch);

    // Initialize mock states
    mockUserState = {
      userData: null,
      tokens: null,
      loading: false,
      error: null,
    };
    mockCalendarsState = {
      list: {},
      pending: false,
      error: null,
    };

    (useAppSelector as jest.Mock).mockImplementation((selector) => {
      const state = {
        user: mockUserState,
        calendars: mockCalendarsState,
      };
      return selector(state);
    });
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

    const { rerender } = render(<CallbackResume />);

    await waitFor(() => {
      expect(oidcAuth.Callback).toHaveBeenCalledWith("verifier123", "state456");
    });
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(setAppLoading(true));
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

    // Simulate async actions completing by updating mock state
    mockUserState = {
      userData: mockUserInfo,
      tokens: mockTokenSet,
      loading: false,
      error: null,
    };
    mockCalendarsState = {
      list: { calendar1: {} },
      pending: false,
      error: null,
    };

    // Re-render to trigger navigation effect
    rerender(<CallbackResume />);

    await waitFor(
      () => {
        expect(dispatch).toHaveBeenCalledWith(setAppLoading(false));
      },
      { timeout: 3000 }
    );
    await waitFor(
      () => {
        expect(dispatch).toHaveBeenCalledWith(replace("/calendar"));
      },
      { timeout: 3000 }
    );
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
      expect(dispatch).toHaveBeenCalledWith(replace("/"));
    });
  });
});
