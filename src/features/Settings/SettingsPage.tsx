import { useAppDispatch } from "@/app/hooks";
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Tab,
  Tabs,
  Typography,
} from "@linagora/twake-mui";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SettingsIcon from "@mui/icons-material/Settings";
import { useState } from "react";
import { useI18n } from "twake-i18n";
import { GeneralSettings } from "./GeneralSettings";
import { NotificationsSettings } from "./NotificationSettings";
import "./SettingsPage.styl";
import { setView } from "./SettingsSlice";

type SidebarNavItem = "settings" | "sync";
type SettingsSubTab = "settings" | "notifications";

export default function SettingsPage({ isInIframe }: { isInIframe?: boolean }) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const [activeNavItem, setActiveNavItem] =
    useState<SidebarNavItem>("settings");
  const [activeSettingsSubTab, setActiveSettingsSubTab] =
    useState<SettingsSubTab>("settings");

  const [languageErrorOpen, setLanguageErrorOpen] = useState(false);
  const [timeZoneErrorOpen, setTimeZoneErrorOpen] = useState(false);
  const [alarmEmailsErrorOpen, setAlarmEmailsErrorOpen] = useState(false);
  const [hideDeclinedEventsErrorOpen, setHideDeclinedEventsErrorOpen] =
    useState(false);
  const [displayWeekNumbersErrorOpen, setDisplayWeekNumbersErrorOpen] =
    useState(false);
  const [workingDaysErrorOpen, setWorkingDaysErrorOpen] = useState(false);

  const handleBackClick = () => {
    dispatch(setView("calendar"));
  };

  const handleNavItemClick = (item: SidebarNavItem) => {
    setActiveNavItem(item);
    if (item === "settings") {
      setActiveSettingsSubTab("settings");
    }
  };

  const handleSettingsSubTabChange = (
    _event: React.SyntheticEvent,
    newValue: SettingsSubTab
  ) => {
    setActiveSettingsSubTab(newValue);
  };
  const handleLanguageErrorClose = () => {
    setLanguageErrorOpen(false);
  };
  const handleTimeZoneErrorClose = () => {
    setTimeZoneErrorOpen(false);
  };
  const handleHideDeclinedEventsErrorClose = () => {
    setHideDeclinedEventsErrorOpen(false);
  };
  const handleAlarmEmailsErrorClose = () => {
    setAlarmEmailsErrorOpen(false);
  };
  const handleDisplayWeekNumbersErrorClose = () => {
    setDisplayWeekNumbersErrorOpen(false);
  };

  return (
    <main
      className={`main-layout settings-layout${isInIframe ? " isInIframe" : ""}`}
    >
      <Box className="settings-sidebar">
        <List>
          <ListItem
            className={`settings-nav-item ${activeNavItem === "settings" ? "active" : ""}`}
            onClick={() => handleNavItemClick("settings")}
            sx={{ cursor: "pointer" }}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary={t("settings.title") || "Settings"} />
          </ListItem>
          {/* <ListItem
            className={`settings-nav-item ${activeNavItem === "sync" ? "active" : ""}`}
            onClick={() => handleNavItemClick("sync")}
            sx={{ cursor: "pointer" }}
          >
            <ListItemIcon>
              <SyncIcon />
            </ListItemIcon>
            <ListItemText primary={t("settings.sync") || "Sync"} />
          </ListItem> */}
        </List>
      </Box>
      <Box className="settings-content">
        <Box className="settings-content-header">
          <IconButton
            onClick={handleBackClick}
            aria-label={t("settings.back") || "Back to calendar"}
            className="back-button"
          >
            <ArrowBackIcon sx={{ color: "#605D62", fontSize: 30 }} />
          </IconButton>
          {activeNavItem === "settings" && (
            <Tabs
              value={activeSettingsSubTab}
              onChange={handleSettingsSubTabChange}
              className="settings-content-tabs"
            >
              <Tab value="settings" label={t("settings.title") || "Settings"} />
              <Tab
                value="notifications"
                label={t("settings.notifications") || "Notifications"}
              />
            </Tabs>
          )}
        </Box>
        <Box className="settings-content-body">
          {activeNavItem === "settings" && (
            <>
              {activeSettingsSubTab === "settings" && (
                <GeneralSettings
                  onLanguageError={() => setLanguageErrorOpen(true)}
                  onTimeZoneError={() => setTimeZoneErrorOpen(true)}
                  onHideDeclinedEventsError={() =>
                    setHideDeclinedEventsErrorOpen(true)
                  }
                  onDisplayWeekNumbersError={() =>
                    setDisplayWeekNumbersErrorOpen(true)
                  }
                  onWorkingDaysError={() => setWorkingDaysErrorOpen(true)}
                />
              )}
              {activeSettingsSubTab === "notifications" && (
                <NotificationsSettings
                  onAlarmEmailsError={() => setAlarmEmailsErrorOpen(true)}
                />
              )}
            </>
          )}
        </Box>
        {activeNavItem === "sync" && (
          <Box className="settings-tab-content">
            <Typography variant="body1" color="text.secondary">
              {t("settings.sync.empty") || "Sync settings coming soon"}
            </Typography>
          </Box>
        )}
      </Box>
      <Snackbar
        open={languageErrorOpen}
        autoHideDuration={4000}
        onClose={handleLanguageErrorClose}
        message={
          t("settings.languageUpdateError") || "Failed to update language"
        }
      />
      <Snackbar
        open={timeZoneErrorOpen}
        autoHideDuration={4000}
        onClose={handleTimeZoneErrorClose}
        message={t("settings.timeZoneUpdateError")}
      />
      <Snackbar
        open={alarmEmailsErrorOpen}
        autoHideDuration={4000}
        onClose={handleAlarmEmailsErrorClose}
        message={
          t("settings.alarmEmailsUpdateError") ||
          "Failed to update email notifications setting"
        }
      />
      <Snackbar
        open={hideDeclinedEventsErrorOpen}
        autoHideDuration={4000}
        onClose={handleHideDeclinedEventsErrorClose}
        message={t("settings.hideDeclinedEventsUpdateError")}
      />
      <Snackbar
        open={displayWeekNumbersErrorOpen}
        autoHideDuration={4000}
        onClose={handleDisplayWeekNumbersErrorClose}
        message={t("settings.displayWeekNumbersUpdateError")}
      />
      <Snackbar
        open={workingDaysErrorOpen}
        autoHideDuration={4000}
        onClose={() => setWorkingDaysErrorOpen(false)}
        message={t("settings.workingDaysUpdateError")}
      />
    </main>
  );
}
