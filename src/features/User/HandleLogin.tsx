import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { Auth } from "./oidcAuth";
import { Loading } from "../../components/Loading/Loading";
import { Error } from "../../components/Error/Error";
import { push } from "redux-first-history";
import { redirectTo } from "../../utils/apiUtils";

export function HandleLogin() {
  const userData = useAppSelector((state) => state.user);
  const calendars = useAppSelector((state) => state.calendars);
  const dispatch = useAppDispatch();
  useEffect(() => {
    const initiateLogin = async () => {
      if (!userData.userData) {
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
  }, [userData]);

  if (!calendars.pending && !userData.loading) {
    dispatch(push("/error"));
  }
  if (!calendars.pending && !userData.loading) {
    dispatch(push("/calendar"));
  }
  return <Loading />;
}

export default HandleLogin;
