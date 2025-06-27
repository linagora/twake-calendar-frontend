import React from "react";
import logo from "../../static/images/calendar.svg";
import "./Menubar.css";
export function Menubar() {
  return (
    <header className="menubar">
      <MainTitle/>
      <div className="menubar-item search-bar">
        <p>big search bar</p>
      </div>
      <div className="menubar-item">
        <p>Account stuff</p>
      </div>
    </header>
  );
}
export function MainTitle() {
  return (
    <div className="menubar-item tc-home">
      <img className="logo" src={logo} />
      <p>
        <span className="twake">Twake</span>
        <span className="calendar-text">Calendar</span>
      </p>
    </div>
  );
}
