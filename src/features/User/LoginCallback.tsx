import { useEffect, useRef } from "react";
import { Callback } from "./oidcAuth";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { push } from "redux-first-history";
import { getOpenPaasUserIdAsync, setTokens, setUserData } from "./userSlice";
import { Loading } from "../../components/Loading/Loading";
import {
  getCalendarDetailAsync,
  getCalendarsListAsync,
} from "../Calendars/CalendarSlice";

export function CallbackResume() {
  const dispatch = useAppDispatch();
  const hasRun = useRef(false);
  const calendars = useAppSelector((state) => state.calendars);
  const userId = useAppSelector((state) => state.user.userData?.openpaasId);
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
        dispatch(getOpenPaasUserIdAsync(data?.tokenSet.access_token ?? ""));
        dispatch(getCalendarsListAsync(data?.tokenSet.access_token ?? ""));

        sessionStorage.removeItem("redirectState");
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
