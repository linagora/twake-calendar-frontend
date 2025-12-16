import React, { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { Auth } from "./oidcAuth";
import { Loading } from "../../components/Loading/Loading";
import { push } from "redux-first-history";
import { redirectTo } from "../../utils/apiUtils";
import { getOpenPaasUserDataAsync, setTokens, setUserData } from "./userSlice";
import { getCalendarsListAsync } from "../Calendars/CalendarSlice";

export function HandleLogin() {
  const userData = useAppSelector((state) => state.user);
  const calendars = useAppSelector((state) => state.calendars);
  const dispatch = useAppDispatch();
  const hasInitiatedRef = useRef(false);
  const calendarsLoadingRef = useRef(false);

  useEffect(() => {
    if (hasInitiatedRef.current) return;
    if (userData.userData) return;
    if (Object.keys(calendars.list).length > 0) return;
    if (calendarsLoadingRef.current) return;

    hasInitiatedRef.current = true;
    const initiateLogin = async () => {
      const savedToken = sessionStorage.getItem("tokenSet")
        ? JSON.parse(sessionStorage.getItem("tokenSet")!)
        : null;
      const savedUser = sessionStorage.getItem("userData")
        ? JSON.parse(sessionStorage.getItem("userData")!)
        : null;

      if (savedToken && savedUser) {
        dispatch(setTokens(savedToken));
        dispatch(setUserData(savedUser));
        await dispatch(getOpenPaasUserDataAsync());
        calendarsLoadingRef.current = true;
        await dispatch(getCalendarsListAsync());
        calendarsLoadingRef.current = false;
        dispatch(push("/calendar"));
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
  }, [userData.userData, calendars.list, dispatch]);
  useEffect(() => {
    if (userData.error) {
      dispatch(push("/error"));
    }
    if (
      !calendars.pending &&
      !userData.loading &&
      !userData.error &&
      !calendars.error
    ) {
      dispatch(push("/calendar"));
    }
  }, [calendars.pending, userData.loading, userData.error, dispatch]);
  return <Loading />;
}

export default HandleLogin;
