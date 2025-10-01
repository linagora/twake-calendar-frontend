import React, { useState } from "react";
import logo from "../../static/header-logo.svg";
import AppsIcon from "@mui/icons-material/Apps";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import "./Menubar.styl";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { stringToColor } from "../../features/Events/EventDisplay";
import {
  Avatar,
  IconButton,
  Popover,
  ButtonGroup,
  Button,
  Select,
  MenuItem,
  FormControl,
  Typography,
} from "@mui/material";
import { push } from "redux-first-history";
import { CalendarApi } from "@fullcalendar/core";

export type AppIconProps = {
  name: string;
  link: string;
  icon: string;
};

export type MenubarProps = {
  calendarRef: React.RefObject<CalendarApi | null>;
  onRefresh: () => void;
  currentDate: Date;
  onDateChange?: (date: Date) => void;
  currentView: string;
  onViewChange?: (view: string) => void;
};

export function Menubar({
  calendarRef,
  onRefresh,
  currentDate,
  onDateChange,
  currentView,
  onViewChange,
}: MenubarProps) {
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

  const handleNavigation = (action: "prev" | "next" | "today") => {
    if (!calendarRef.current) return;

    switch (action) {
      case "prev":
        calendarRef.current.prev();
        break;
      case "next":
        calendarRef.current.next();
        break;
      case "today":
        calendarRef.current.today();
        break;
    }

    // Notify parent about date change after navigation
    if (onDateChange) {
      const newDate = calendarRef.current.getDate();
      onDateChange(newDate);
    }
  };

  const handleViewChange = (view: string) => {
    if (!calendarRef.current) return;
    calendarRef.current.changeView(view);

    // Notify parent about view change
    if (onViewChange) {
      onViewChange(view);
    }

    // Notify parent about date change after view change
    if (onDateChange) {
      const newDate = calendarRef.current.getDate();
      onDateChange(newDate);
    }
  };

  const handleRefresh = () => {
    onRefresh();
  };

  const open = Boolean(anchorEl);
  return (
    <>
      <header className="menubar">
        <div className="left-menu">
          <div className="menu-items">
            <MainTitle />
          </div>
          <div className="menu-items">
            <div className="navigation-controls">
              <ButtonGroup variant="outlined" size="small">
                <Button onClick={() => handleNavigation("prev")}>
                  <ChevronLeftIcon />
                </Button>
                <Button onClick={() => handleNavigation("today")}>Today</Button>
                <Button onClick={() => handleNavigation("next")}>
                  <ChevronRightIcon />
                </Button>
              </ButtonGroup>
            </div>
          </div>
          <div className="menu-items">
            <div className="current-date-time">
              <Typography variant="h6" component="div">
                {currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </Typography>
            </div>
          </div>
        </div>
        <div className="right-menu">
          <div className="menu-items">
            <IconButton onClick={onRefresh}>
              <RefreshIcon />
            </IconButton>
          </div>
          <div className="menu-items">
            <FormControl
              size="small"
              style={{ minWidth: 120, marginRight: 16 }}
            >
              <Select
                value={currentView}
                onChange={(e) => handleViewChange(e.target.value)}
                variant="outlined"
              >
                <MenuItem value="dayGridMonth">Month</MenuItem>
                <MenuItem value="timeGridWeek">Week</MenuItem>
                <MenuItem value="timeGridDay">Day</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="menu-items">
            {applist.length > 0 && (
              <IconButton onClick={handleOpen} style={{ marginRight: 8 }}>
                <AppsIcon />
              </IconButton>
            )}
          </div>
          <div className="menu-items">
            <Avatar
              style={{
                backgroundColor: stringToColor(
                  user && user.family_name
                    ? user.family_name
                    : user && user.email
                      ? user.email
                      : ""
                ),
              }}
              sizes="large"
            >
              {user?.name && user?.family_name
                ? `${user.name[0]}${user.family_name[0]}`
                : (user?.email?.[0] ?? "")}
            </Avatar>
          </div>
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
            <AppIcon key={prop.name} prop={prop} />
          ))}
        </div>
      </Popover>
    </>
  );
}
export function MainTitle() {
  return (
    <div className="menubar-item tc-home">
      <img className="logo" src={logo} alt="Calendar" />
    </div>
  );
}

function AppIcon({ prop }: { prop: AppIconProps }) {
  return (
    <a
      href={prop.link}
      target="_blank"
      rel="noreferrer"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div>
        <img src={prop.icon} alt={prop.name} />
        <p>{prop.name}</p>
      </div>
    </a>
  );
}
