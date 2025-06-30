import { useEffect, useRef } from "react";
import { Callback } from "./oidcAuth";
import { useAppDispatch } from "../../app/hooks";
import { push } from "redux-first-history";
import { setUserData } from "./userSlice";
import { Loading } from "../../components/Loading/Loading";

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
        console.log("data:", data);
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
