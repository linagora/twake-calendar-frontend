import React, { useEffect } from "react";
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
  useEffect(() => {
    const initiateLogin = async () => {
      if (!userData.userData) {
        const savedToken = sessionStorage.getItem("tokenSet")
          ? JSON.parse(sessionStorage.getItem("tokenSet")!)
          : null;
        const savedUser = sessionStorage.getItem("userData")
          ? JSON.parse(sessionStorage.getItem("userData")!)
          : null;

        if (savedToken && savedUser) {
          dispatch(setTokens(savedToken));
          dispatch(setUserData(savedUser));
          dispatch(getOpenPaasUserDataAsync());
          dispatch(getCalendarsListAsync());
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
      }
    };

    initiateLogin();
  }, [userData, dispatch]);

  if (!calendars.pending && !userData.loading) {
    dispatch(push("/error"));
  }
  if (!calendars.pending && !userData.loading) {
    dispatch(push("/calendar"));
  }
  return <Loading />;
}

export default HandleLogin;
