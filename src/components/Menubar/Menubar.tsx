import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { setView } from "@/features/Settings/SettingsSlice";
import { Logout } from "@/features/User/oidcAuth";
import logo from "@/static/header-logo.svg";
import { getInitials, stringToGradient } from "@/utils/avatarUtils";
import { getUserDisplayName } from "@/utils/userUtils";
import { redirectTo } from "@/utils/navigation";
import { CalendarApi } from "@fullcalendar/core";
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Divider,
  FormControl,
  IconButton,
  Menu,
  MenuItem,
  Popover,
  Select,
  Typography,
} from "@linagora/twake-mui";
import WidgetsOutlinedIcon from "@mui/icons-material/WidgetsOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import React, { useEffect, useState } from "react";
import { push } from "redux-first-history";
import { useI18n } from "twake-i18n";
import SearchBar from "./EventSearchBar";
import "./Menubar.styl";

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
  const { t, lang } = useI18n(); // deliberately NOT using f()
  const user = useAppSelector((state) => state.user.userData);
  const applist: AppIconProps[] = (window as any).appList ?? [];
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!user) {
      dispatch(push("/"));
    }
  }, [dispatch, user]);

  if (!user) {
    return null;
  }
  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigation = async (action: "prev" | "next" | "today") => {
    if (!calendarRef.current) return;
    await dispatch(setView("calendar"));
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

  const handleViewChange = async (view: string) => {
    if (!calendarRef.current) return;
    await dispatch(setView("calendar"));

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
  const userMenuOpen = Boolean(userMenuAnchorEl);

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleSettingsClick = () => {
    dispatch(setView("settings"));
    handleUserMenuClose();
  };

  const handleLogoutClick = async () => {
    const logoutUrl = await Logout();
    sessionStorage.removeItem("tokenSet");
    redirectTo(logoutUrl.href);
    handleUserMenuClose();
  };

  // Use i18n for month names instead of date-fns
  const monthIndex = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const monthName = t(`months.standalone.${monthIndex}`);
  const dateLabel = `${monthName} ${year}`;

  return (
    <>
      <header className="menubar">
        <div className="left-menu">
          <div className="menu-items">
            <MainTitle
              calendarRef={calendarRef}
              currentView={currentView}
              onViewChange={onViewChange}
              onDateChange={onDateChange}
            />
          </div>
          <div className="menu-items">
            <div className="navigation-controls">
              <ButtonGroup
                variant="outlined"
                size="medium"
                sx={{
                  "& button:first-of-type": {
                    borderRadius: "12px 0 0 12px",
                  },
                  "& button:last-of-type": {
                    borderRadius: "0 12px 12px 0",
                  },
                }}
              >
                <Button
                  sx={{ width: 20 }}
                  onClick={() => handleNavigation("prev")}
                >
                  <ChevronLeftIcon sx={{ height: 20 }} />
                </Button>
                <Button onClick={() => handleNavigation("today")}>
                  {t("menubar.today")}
                </Button>
                <Button
                  sx={{ width: 20 }}
                  onClick={() => handleNavigation("next")}
                >
                  <ChevronRightIcon sx={{ height: 20 }} />
                </Button>
              </ButtonGroup>
            </div>
          </div>
          <div className="menu-items">
            <div className="current-date-time">
              <p>
                {dateLabel}
              </p>
            </div>
          </div>
        </div>
        <div className="right-menu">
          <div className="search-container">
            <SearchBar />
          </div>
          <div className="menu-items">
            <IconButton
              className="refresh-button"
              onClick={onRefresh}
              aria-label={t("menubar.refresh")}
              title={t("menubar.refresh")}
              sx={{ mr: 1 }}
            >
              <RefreshIcon />
            </IconButton>
          </div>
          <div className="menu-items">
            <FormControl
              size="small"
              style={{ minWidth: 120, marginRight: 16 }}
              className="select-display"
            >
              <Select
                value={currentView}
                onChange={(e) => handleViewChange(e.target.value)}
                variant="outlined"
                aria-label={t("menubar.viewSelector")}
                sx={{
                  borderRadius: "12px",
                  marginLeft: 1,
                  "& fieldset": { borderRadius: "12px" }
                }}
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
            <IconButton
              component="a"
              href="https://twake.app/support/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginRight: 8 }}
              aria-label={t("menubar.help")}
              title={t("menubar.help")}
            >
              <HelpOutlineIcon />
            </IconButton>
          </div>
          <div className="menu-items">
            {applist.length > 0 && (
              <IconButton
                onClick={handleOpen}
                style={{ marginRight: 8 }}
                aria-label={t("menubar.apps")}
                title={t("menubar.apps")}
              >
                <WidgetsOutlinedIcon />
              </IconButton>
            )}
          </div>

          <div className="menu-items">
            <IconButton onClick={handleUserMenuClick}>
              <Avatar
                color={stringToGradient(getUserDisplayName(user))}
                size="m"
                aria-label={t("menubar.userProfile")}
              >
                {getInitials(getUserDisplayName(user))}
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
        PaperProps={{
          sx: {
            minWidth: 230,
            mt: 2,
            p: "14px 8px",
            borderRadius: "14px",
          },
        }}
      >
        <div className="app-grid">
          {applist.map((prop: AppIconProps) => (
            <AppIcon key={prop.name} prop={prop} />
          ))}
        </div>
      </Popover>

      <Menu
        open={userMenuOpen}
        anchorEl={userMenuAnchorEl}
        onClose={handleUserMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            minWidth: 280,
            mt: 1,
            padding: "0 !important",
            borderRadius: "14px",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "24px",
          }}
        >
          <Avatar
            color={stringToGradient(getUserDisplayName(user))}
            size="m"
            sx={{ marginBottom: "8px" }}
          >
            {getInitials(getUserDisplayName(user))}
          </Avatar>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {getUserDisplayName(user)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        <MenuItem onClick={handleSettingsClick} sx={{ py: 1.5 }}>
          <SettingsIcon sx={{ mr: 2 }} />
          {t("menubar.settings") || "Settings"}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogoutClick} sx={{ py: 1.5 }}>
          <LogoutIcon sx={{ mr: 2 }} />
          {t("menubar.logout") || "Logout"}
        </MenuItem>
      </Menu>
    </>
  );
}

export type MainTitleProps = {
  calendarRef: React.RefObject<CalendarApi | null>;
  currentView: string;
  onViewChange?: (view: string) => void;
  onDateChange?: (date: Date) => void;
};

export function MainTitle({
  calendarRef,
  currentView,
  onViewChange,
  onDateChange,
}: MainTitleProps) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();

  const handleLogoClick = async () => {
    if (!calendarRef.current) return;

    await dispatch(setView("calendar"));

    if (currentView !== "timeGridWeek") {
      calendarRef.current.changeView("timeGridWeek");
      if (onViewChange) {
        onViewChange("timeGridWeek");
      }
    }

    calendarRef.current.today();

    if (onDateChange) {
      const newDate = calendarRef.current.getDate();
      onDateChange(newDate);
    }
  };

  return (
    <div className="menubar-item tc-home">
      <img
        className="logo"
        src={logo}
        alt={t("menubar.logoAlt")}
        onClick={handleLogoClick}
      />
    </div>
  );
}

function AppIcon({ prop }: { prop: AppIconProps }) {
  return (
    <Box
      component="a"
      href={prop.link}
      target="_blank"
      rel="noreferrer"
      sx={{
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        p: "8px 12px 5px",
        borderRadius: "14px",
        "&:hover": {
          backgroundColor: "action.hover",
        },
      }}
    >
      <Box
        component="img"
        src={prop.icon}
        alt={prop.name}
        sx={{ maxWidth: 42, height: 42 }}
      />
      <Typography sx={{ mt: 0.75, textAlign: "center", fontSize: 12 }}>
        {prop.name}
      </Typography>
    </Box>
  );
}
