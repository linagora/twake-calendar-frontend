import React, { useState } from "react";
import logo from "../../static/images/calendar.svg";
import AppsIcon from "@mui/icons-material/Apps";
import "./Menubar.css";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { stringToColor } from "../../features/Events/EventDisplay";
import { Avatar, IconButton, Popover } from "@mui/material";
import { push } from "redux-first-history";

export type AppIconProps = {
  name: string;
  link: string;
  icon: string;
};

export function Menubar() {
  const user = useAppSelector((state) => state.user.userData);
  const applist: AppIconProps[] = (window as any).appList ?? [];
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const dispatch = useAppDispatch();

  if (!user) {
    dispatch(push("/"));
  }
  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  return (
    <>
      <header className="menubar">
        <MainTitle />
        <div className="menubar-item search-bar">
          <p>big search bar</p>
        </div>

        <div className="menubar-item">
          {applist.length > 0 && (
            <IconButton onClick={handleOpen}>
              <AppsIcon />
            </IconButton>
          )}
          <Avatar
            sx={{ bgcolor: stringToColor(user.family_name) }}
            sizes="large"
          >
            {user.name[0]}
            {user.family_name[0]}
          </Avatar>
        </div>
      </header>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <div className="app-grid">
          {applist.map((prop: AppIconProps) => (
            <AppIcon prop={prop} />
          ))}
        </div>
      </Popover>
    </>
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

function AppIcon({ prop }: { prop: AppIconProps }) {
  return (
    <a
      key={prop.name}
      href={prop.link}
      target="_blank"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div>
        <img src={prop.icon} alt={prop.name} />
        <p>{prop.name}</p>
      </div>
    </a>
  );
}
