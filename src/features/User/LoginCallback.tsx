import { useEffect, useRef } from "react";
import { Callback } from "./oidcAuth";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { push } from "redux-first-history";
import { getOpenPaasUserDataAsync, setTokens, setUserData } from "./userSlice";
import { Loading } from "../../components/Loading/Loading";
import { getCalendarsListAsync } from "../Calendars/CalendarSlice";

export function CallbackResume() {
  const dispatch = useAppDispatch();
  const hasRun = useRef(false);
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
        dispatch(setUserData(data?.userinfo));
        dispatch(setTokens(data?.tokenSet));
        await dispatch(getOpenPaasUserDataAsync());
        await dispatch(getCalendarsListAsync());

        sessionStorage.removeItem("redirectState");
        sessionStorage.setItem("tokenSet", JSON.stringify(data?.tokenSet));
        sessionStorage.setItem("userData", JSON.stringify(data?.userinfo));
        // Redirect to main page after successful callback
        dispatch(push("/"));
      } catch (e) {
        console.error("OIDC callback error:", e);
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
