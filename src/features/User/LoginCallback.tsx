import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Callback } from "./oidcAuth";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { push } from "redux-first-history";
import { setUserData } from "./userSlice";
import { Loading } from "../../components/Loading/Loading";

export function CallbackResume() {
  const dispatch = useAppDispatch();
  const hasRun = useRef(false);
  const saved = sessionStorage.getItem("redirectState")
    ? JSON.parse(sessionStorage.getItem("redirectState")!)
    : null;
  const [tokens, setTokens] = useState<any>();
  const [userInfo, setUserInfo] = useState<any>();
  const location = useAppSelector((state) => state.router.location);
  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    const runCallback = async () => {
      try {
        const data = await Callback(saved?.code_verifier, saved?.state);
        console.log("data:", data);
        setTokens(data?.tokenSet);
        setUserInfo(data?.userinfo);
        dispatch(setUserData(data?.userinfo));
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
