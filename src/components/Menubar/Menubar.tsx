import React, { useState } from "react";
import logo from "../../static/header-logo.svg";
import AppsIcon from "@mui/icons-material/Apps";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import "./Menubar.styl";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { stringToColor } from "../Event/utils/eventUtils";
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
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";

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
  const { t, f, lang, setLang } = useI18n();
  const user = useAppSelector((state) => state.user.userData);
  const applist: AppIconProps[] = (window as any).appList ?? [];
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
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

  const open = Boolean(anchorEl);
  const langOpen = Boolean(langAnchorEl);

  const handleLangClick = (event: React.MouseEvent<HTMLElement>) => {
    setLangAnchorEl(event.currentTarget);
  };
  const handleLangClose = () => setLangAnchorEl(null);

  const availableLangs = [
    { code: "en", label: "English" },
    { code: "fr", label: "Français" },
  ];

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
                <Button onClick={() => handleNavigation("today")}>
                  {t("menubar.today")}
                </Button>
                <Button onClick={() => handleNavigation("next")}>
                  <ChevronRightIcon />
                </Button>
              </ButtonGroup>
            </div>
          </div>
          <div className="menu-items">
            <div className="current-date-time">
              <Typography variant="h6" component="div">
                {f(currentDate, "MMMM yyyy")}
              </Typography>
            </div>
          </div>
        </div>
        <div className="right-menu">
          <div className="menu-items">
            <IconButton
              onClick={onRefresh}
              aria-label={t("menubar.refresh")}
              title={t("menubar.refresh")}
            >
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
                aria-label={t("menubar.viewSelector")}
              >
                <MenuItem value="dayGridMonth">
                  {t("menubar.views.month")}
                </MenuItem>
                <MenuItem value="timeGridWeek">
                  {t("menubar.views.week")}
                </MenuItem>
                <MenuItem value="timeGridDay">
                  {t("menubar.views.day")}
                </MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="menu-items">
            {applist.length > 0 && (
              <IconButton
                onClick={handleOpen}
                style={{ marginRight: 8 }}
                aria-label={t("menubar.apps")}
                title={t("menubar.apps")}
              >
                <AppsIcon />
              </IconButton>
            )}
          </div>

          <div className="menu-items">
            <IconButton onClick={handleLangClick}>
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
                aria-label={t("menubar.userProfile")}
              >
                {user?.name && user?.family_name
                  ? `${user.name[0]}${user.family_name[0]}`
                  : (user?.email?.[0] ?? "")}
              </Avatar>
            </IconButton>
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

      <Popover
        open={langOpen}
        anchorEl={langAnchorEl}
        onClose={handleLangClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <FormControl size="small" style={{ minWidth: 100, marginRight: 8 }}>
          <Select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            variant="outlined"
            aria-label={t("menubar.languageSelector")}
          >
            {availableLangs.map(({ code, label }) => (
              <MenuItem key={code} value={code}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Popover>
    </>
  );
}

export function MainTitle() {
  const { t } = useI18n();
  return (
    <div className="menubar-item tc-home">
      <img className="logo" src={logo} alt={t("menubar.logoAlt")} />
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
