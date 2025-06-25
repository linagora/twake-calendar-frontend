import React from "react";
import { Auth } from "../../features/User/oidcAuth";
import logo from "../../static/images/calendar.svg";
import "./Menubar.css";
import { useAppSelector } from "../../app/hooks";
export function Menubar() {
  return (
    <div className="menubar">
      <div className="menubar-item tc-home">
        <img className="logo" src={logo} />
        <p>
          <span className="twake">Twake</span>
          <span className="calendar">Calendar</span>
        </p>
      </div>
      <div className="menubar-item nav-month">
        <p>Current Month</p>
        <p className="day-selector"> droite today gauche</p>
      </div>
      <div className="menubar-item search-bar">
        <p>big search bar</p>
      </div>
      <div className="menubar-item menu-tools">
        <HandleLogin />
      </div>
    </div>
  );
}

function HandleLogin() {
  const userData = useAppSelector((state) => state.user.userData);
  if (!userData) {
    return (
      <button
        onClick={async () => {
          const loginurl = await Auth();
          sessionStorage.setItem(
            "redirectState",
            JSON.stringify({
              code_verifier: loginurl.code_verifier,
              state: loginurl.state,
            })
          );

          window.location.assign(loginurl.redirectTo);
        }}
      >
        login
      </button>
    );
  } else {
    return <p>{userData.sub}</p>;
  }
}
