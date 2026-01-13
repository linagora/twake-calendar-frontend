import { useEffect, useRef } from "react";
import { Callback } from "./oidcAuth";
import { useAppDispatch } from "../../app/hooks";
import { push } from "redux-first-history";
import {
  getOpenPaasUserDataAsync,
  setTokens,
  setUserData,
  setUserError,
} from "./userSlice";
import { Loading } from "../../components/Loading/Loading";
import { getCalendarsListAsync } from "../Calendars/services/getCalendarsListAsync";

export function CallbackResume() {
  const dispatch = useAppDispatch();
  const hasRun = useRef(false);
  const calendarsLoadingRef = useRef(false);
  const saved = sessionStorage.getItem("redirectState")
    ? JSON.parse(sessionStorage.getItem("redirectState")!)
    : null;
  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    const runCallback = async () => {
      try {
        const data = await Callback(saved?.code_verifier, saved?.state);
        if (!data || !data.userinfo || !data.tokenSet) {
          throw new Error("OAuth callback failed");
        }
        dispatch(setUserData(data?.userinfo));
        dispatch(setTokens(data?.tokenSet));
        await dispatch(getOpenPaasUserDataAsync());
        if (!calendarsLoadingRef.current) {
          calendarsLoadingRef.current = true;
          await dispatch(getCalendarsListAsync());
          calendarsLoadingRef.current = false;
        }

        sessionStorage.removeItem("redirectState");
        sessionStorage.setItem("tokenSet", JSON.stringify(data?.tokenSet));
        sessionStorage.setItem("userData", JSON.stringify(data?.userinfo));
        // Redirect to main page after successful callback
        dispatch(push("/"));
      } catch (e) {
        console.error("OIDC callback error:", e);
        // Redirect to error page after error
        dispatch(
          setUserError(e instanceof Error ? e.message : "OAuth callback failed")
        );
        dispatch(push("/error"));
      }
    };

    if (saved?.code_verifier) {
      runCallback();
    } else {
      console.warn("Missing redirectState");
      sessionStorage.removeItem("redirectState");
      dispatch(push("/"));
    }
  }, [dispatch, saved]);

  return <Loading />;
}
