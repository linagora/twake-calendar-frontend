import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { useEffect, useRef } from "react";
import { replace } from "redux-first-history";
import { getCalendarsListAsync } from "../Calendars/services";
import { Callback } from "./oidcAuth";
import {
  getOpenPaasUserDataAsync,
  setTokens,
  setUserData,
  setUserError,
} from "./userSlice";
import { setAppLoading } from "@/app/loadingSlice";

export function CallbackResume() {
  const dispatch = useAppDispatch();
  const hasRun = useRef(false);
  const hasNavigated = useRef(false);
  const userData = useAppSelector((state) => state.user);
  const calendars = useAppSelector((state) => state.calendars);

  // Process callback and load data
  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;

    const runCallback = async () => {
      // Read redirectState inside useEffect to avoid stale closures
      const saved = sessionStorage.getItem("redirectState")
        ? JSON.parse(sessionStorage.getItem("redirectState")!)
        : null;

      // Check if we have saved tokens (already logged in)
      const savedToken = sessionStorage.getItem("tokenSet")
        ? JSON.parse(sessionStorage.getItem("tokenSet")!)
        : null;

      // If no redirectState but we have saved session, just go home
      // This can happen if user refreshes callback page or gets redirected here after already logged in
      if (!saved?.code_verifier) {
        if (savedToken) {
          sessionStorage.removeItem("redirectState");
          dispatch(replace("/"));
          return;
        }

        console.warn("Missing redirectState");
        sessionStorage.removeItem("redirectState");
        dispatch(replace("/"));
        return;
      }

      try {
        dispatch(setAppLoading(true));

        const data = await Callback(saved.code_verifier, saved.state);

        if (!data || !data.userinfo || !data.tokenSet) {
          throw new Error("OAuth callback failed");
        }

        // IMPORTANT: Save tokens to sessionStorage FIRST before making any API calls
        // because API calls will read token from sessionStorage
        sessionStorage.setItem("tokenSet", JSON.stringify(data.tokenSet));
        sessionStorage.setItem("userData", JSON.stringify(data.userinfo));

        dispatch(setUserData(data.userinfo));
        dispatch(setTokens(data.tokenSet));

        await dispatch(getOpenPaasUserDataAsync());
        await dispatch(getCalendarsListAsync());

        sessionStorage.removeItem("redirectState");
      } catch (e) {
        console.error("OIDC callback error:", e);
        dispatch(setAppLoading(false));
        dispatch(
          setUserError(e instanceof Error ? e.message : "OAuth callback failed")
        );
        dispatch(replace("/error"));
      }
    };

    runCallback();
  }, [dispatch]);

  // Navigate to /calendar only when all data is ready
  useEffect(() => {
    if (hasNavigated.current) return;
    if (userData.loading || calendars.pending) return;
    if (userData.error || calendars.error) {
      dispatch(setAppLoading(false));
      dispatch(replace("/error"));
      return;
    }
    if (!userData.userData || !userData.tokens) return;
    // Calendars list can be empty, that's valid - just need to finish loading

    // All data is ready, navigate to calendar
    hasNavigated.current = true;
    dispatch(setAppLoading(false));

    // Clear any query params from URL first, then navigate
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    dispatch(replace("/calendar"));
  }, [
    userData.loading,
    userData.userData,
    userData.tokens,
    userData.error,
    calendars.pending,
    calendars.error,
    dispatch,
  ]);

  return null;
}
