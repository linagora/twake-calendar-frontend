import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { redirectTo } from "@/utils/apiUtils";
import { useEffect, useRef } from "react";
import { push } from "redux-first-history";
import { getCalendarsListAsync } from "../Calendars/services";
import { Auth } from "./oidcAuth";
import { getOpenPaasUserDataAsync, setTokens, setUserData } from "./userSlice";
import { setAppLoading } from "@/app/loadingSlice";

export function HandleLogin() {
  const userData = useAppSelector((state) => state.user);
  const calendars = useAppSelector((state) => state.calendars);
  const dispatch = useAppDispatch();
  const hasInitiatedRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  // Initiate login or load saved data
  useEffect(() => {
    if (hasInitiatedRef.current) return;
    if (userData.userData && !calendars.pending) return;

    hasInitiatedRef.current = true;

    const initiateLogin = async () => {
      const savedToken = sessionStorage.getItem("tokenSet")
        ? JSON.parse(sessionStorage.getItem("tokenSet")!)
        : null;
      const savedUser = sessionStorage.getItem("userData")
        ? JSON.parse(sessionStorage.getItem("userData")!)
        : null;

      if (savedToken && savedUser) {
        dispatch(setAppLoading(true));
        dispatch(setTokens(savedToken));
        dispatch(setUserData(savedUser));
        await dispatch(getOpenPaasUserDataAsync());
        await dispatch(getCalendarsListAsync());
        return;
      }

      const loginurl = await Auth();

      sessionStorage.setItem(
        "redirectState",
        JSON.stringify({
          code_verifier: loginurl.code_verifier,
          state: loginurl.state,
        })
      );

      redirectTo(loginurl.redirectTo);
    };

    initiateLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.userData, calendars.list, dispatch]);

  // Navigate to /calendar only when all data is ready
  useEffect(() => {
    if (hasNavigatedRef.current) return;
    if (userData.loading || calendars.pending) return;
    if (userData.error || calendars.error) {
      dispatch(setAppLoading(false));
      dispatch(push("/error"));
      return;
    }
    if (!userData.userData || !userData.tokens) return;
    // Calendars list can be empty, that's valid - just need to finish loading

    // All data is ready, navigate to calendar
    hasNavigatedRef.current = true;
    dispatch(setAppLoading(false));
    dispatch(push("/calendar"));
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

export default HandleLogin;
