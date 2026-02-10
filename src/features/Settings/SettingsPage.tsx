import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { useTimeZoneList } from "@/components/Calendar/TimezoneSelector";
import { TimezoneAutocomplete } from "@/components/Timezone/TimezoneAutocomplete";
import { browserDefaultTimeZone, getTimezoneOffset } from "@/utils/timezone";
import {
  Box,
  FormControl,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  Typography,
} from "@linagora/twake-mui";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SettingsIcon from "@mui/icons-material/Settings";
import React, { useState } from "react";
import { useI18n } from "twake-i18n";
import {
  setAlarmEmails,
  setLanguage as setUserLanguage,
  setTimezone as setUserTimeZone,
  updateUserConfigurationsAsync,
} from "../User/userSlice";
import { AVAILABLE_LANGUAGES } from "./constants";
import "./SettingsPage.styl";
import {
  setDisplayWeekNumbers,
  setHideDeclinedEvents,
  setIsBrowserDefaultTimeZone,
  setLanguage as setSettingsLanguage,
  setTimeZone as setSettingsTimeZone,
  setView,
} from "./SettingsSlice";

type SidebarNavItem = "settings" | "sync";
type SettingsSubTab = "settings" | "notifications";

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const previousConfig = useAppSelector((state) => state.user.coreConfig);
  const userLanguage = useAppSelector(
    (state) => state.user?.coreConfig.language
  );
  const settingsLanguage = useAppSelector((state) => state.settings?.language);
  const currentLanguage = userLanguage || settingsLanguage || "en";

  const timezoneList = useTimeZoneList();
  const userTimeZone = useAppSelector(
    (state) => state.user?.coreConfig?.datetime?.timeZone
  );
  const settingTimeZone = useAppSelector((state) => state.settings?.timeZone);
  const currentTimeZone =
    userTimeZone ?? settingTimeZone ?? browserDefaultTimeZone;
  const isBrowserDefault = useAppSelector(
    (state) => state.settings.isBrowserDefaultTimeZone
  );
  const alarmEmailsEnabled = useAppSelector(
    (state) => state.user?.alarmEmailsEnabled ?? true
  );

  const hideDeclinedEvents = useAppSelector(
    (state) => state.settings?.hideDeclinedEvents
  );

  const displayWeekNumbers = useAppSelector(
    (state) => state.settings?.displayWeekNumbers
  );

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

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLanguage = event.target.value;
    const previousLanguage = currentLanguage;

    // Optimistic update - update UI immediately
    dispatch(setUserLanguage(newLanguage));
    dispatch(setSettingsLanguage(newLanguage));

    // Call API in background, don't wait for it
    dispatch(updateUserConfigurationsAsync({ language: newLanguage }))
      .unwrap()
      .catch((error) => {
        console.error("Failed to update language:", error);
        // Rollback on error
        dispatch(setUserLanguage(previousLanguage));
        dispatch(setSettingsLanguage(previousLanguage));
        setLanguageErrorOpen(true);
      });
  };

  const handleLanguageErrorClose = () => {
    setLanguageErrorOpen(false);
  };

  const handleTimeZoneChange = (newTimeZone: string) => {
    const previousTimeZone = currentTimeZone;

    // Optimistic update - update UI immediately
    dispatch(setUserTimeZone(newTimeZone));
    dispatch(setSettingsTimeZone(newTimeZone));

    // Call API in background, don't wait for it
    dispatch(
      updateUserConfigurationsAsync({ timezone: newTimeZone, previousConfig })
    )
      .unwrap()
      .catch((error) => {
        console.error("Failed to update TimeZone:", error);
        // Rollback on error
        dispatch(setUserTimeZone(previousTimeZone));
        dispatch(setSettingsTimeZone(previousTimeZone));
        setTimeZoneErrorOpen(true);
      });
  };

  const handleTimeZoneDefaultChange = (isDefault: boolean) => {
    const previousTimeZone = currentTimeZone;

    // Optimistic update - update UI immediately
    dispatch(setIsBrowserDefaultTimeZone(isDefault));
    if (isDefault) {
      dispatch(setUserTimeZone(null));
      dispatch(setSettingsTimeZone(browserDefaultTimeZone));

      // Call API in background, don't wait for it
      dispatch(
        updateUserConfigurationsAsync({ timezone: null, previousConfig })
      )
        .unwrap()
        .catch((error) => {
          console.error("Failed to update TimeZone:", error);
          // Rollback on error
          dispatch(setUserTimeZone(previousTimeZone));
          dispatch(setSettingsTimeZone(previousTimeZone));
          dispatch(setIsBrowserDefaultTimeZone(!isDefault));
          setTimeZoneErrorOpen(true);
        });
    }
  };

  const handleTimeZoneErrorClose = () => {
    setTimeZoneErrorOpen(false);
  };

  const handleHideDeclinedEvents = (doHideDeclinedEvents: boolean) => {
    // Optimistic update - update UI immediately
    dispatch(setHideDeclinedEvents(doHideDeclinedEvents));

    // Call API in background, don't wait for it
    dispatch(
      updateUserConfigurationsAsync({
        hideDeclinedEvents: doHideDeclinedEvents,
      })
    )
      .unwrap()
      .catch((error) => {
        console.error("Failed to update hide declined event:", error);
        dispatch(setHideDeclinedEvents(!doHideDeclinedEvents));
        setHideDeclinedEventsErrorOpen(true);
      });
  };
  const handleHideDeclinedEventsErrorClose = () => {
    setHideDeclinedEventsErrorOpen(false);
  };

  const handleAlarmEmailsToggle = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.checked;
    const previousValue = alarmEmailsEnabled;

    // Optimistic update - update UI immediately
    dispatch(setAlarmEmails(newValue));

    // Call API in background, don't wait for it
    dispatch(updateUserConfigurationsAsync({ alarmEmails: newValue }))
      .unwrap()
      .catch((error) => {
        console.error("Failed to update alarm emails:", error);
        // Rollback on error
        dispatch(setAlarmEmails(previousValue));
        setAlarmEmailsErrorOpen(true);
      });
  };

  const handleAlarmEmailsErrorClose = () => {
    setAlarmEmailsErrorOpen(false);
  };

  const handleDisplayWeekNumbers = (doDisplayWeekNumbers: boolean) => {
    // Optimistic update - update UI immediately
    dispatch(setDisplayWeekNumbers(doDisplayWeekNumbers));

    // Call API in background, don't wait for it
    dispatch(
      updateUserConfigurationsAsync({
        displayWeekNumbers: doDisplayWeekNumbers,
      })
    )
      .unwrap()
      .catch((error) => {
        console.error("Failed to update the week number setting:", error);
        dispatch(setDisplayWeekNumbers(!doDisplayWeekNumbers));
        setDisplayWeekNumbersErrorOpen(true);
      });
  };
  const handleDisplayWeekNumbersErrorClose = () => {
    setDisplayWeekNumbersErrorOpen(false);
  };

  return (
    <main className="main-layout settings-layout">
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
                <Box className="settings-tab-content">
                  <Box sx={{ mb: 6 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {t("settings.language") || "Language"}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 3 }}
                    >
                      {t("settings.languageDescription") ||
                        "This will be the language used in your Twake Calendar"}
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 500 }}>
                      <Select
                        value={currentLanguage}
                        onChange={handleLanguageChange}
                        variant="outlined"
                        aria-label={
                          t("settings.languageSelector") || "Language selector"
                        }
                      >
                        {AVAILABLE_LANGUAGES.map(({ code, label }) => (
                          <MenuItem key={code} value={code}>
                            {label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {t("settings.timeZone")}
                    </Typography>
                    <Box
                      sx={{
                        mb: 6,
                      }}
                    >
                      <FormControl size="small" sx={{ minWidth: 500 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={isBrowserDefault}
                              onChange={() =>
                                handleTimeZoneDefaultChange(!isBrowserDefault)
                              }
                              aria-label={t("settings.timeZoneBrowserDefault")}
                            />
                          }
                          label={t("settings.timeZoneBrowserDefault")}
                          labelPlacement="start"
                          sx={{
                            minWidth: 400,
                            justifyContent: "space-between",
                            marginLeft: 0,
                            mb: 2,
                          }}
                        />
                        {!isBrowserDefault && (
                          <TimezoneAutocomplete
                            value={currentTimeZone}
                            zones={timezoneList.zones}
                            getTimezoneOffset={getTimezoneOffset}
                            onChange={handleTimeZoneChange}
                          />
                        )}
                      </FormControl>
                    </Box>
                  </Box>
                  <Box sx={{ mb: 6 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {t("settings.calAndEvent")}
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 500 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(!hideDeclinedEvents)}
                            onChange={() =>
                              handleHideDeclinedEvents(!hideDeclinedEvents)
                            }
                            aria-label={t("settings.showDeclinedEvent")}
                          />
                        }
                        label={t("settings.showDeclinedEvent")}
                        labelPlacement="start"
                        sx={{
                          minWidth: 400,
                          justifyContent: "space-between",
                          marginLeft: 0,
                        }}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(displayWeekNumbers)}
                            onChange={() =>
                              handleDisplayWeekNumbers(!displayWeekNumbers)
                            }
                            aria-label={t("settings.displayWeekNumbers")}
                          />
                        }
                        label={t("settings.displayWeekNumbers")}
                        labelPlacement="start"
                        sx={{
                          minWidth: 400,
                          justifyContent: "space-between",
                          marginLeft: 0,
                        }}
                      />
                    </FormControl>
                  </Box>
                </Box>
              )}
              {activeSettingsSubTab === "notifications" && (
                <Box className="settings-tab-content">
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    {t("settings.notifications.deliveryMethod") ||
                      "Delivery method"}
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={alarmEmailsEnabled}
                        onChange={handleAlarmEmailsToggle}
                        aria-label={
                          t("settings.notifications.email") || "Email"
                        }
                      />
                    }
                    label={t("settings.notifications.email") || "Email"}
                    labelPlacement="start"
                    sx={{
                      minWidth: 400,
                      justifyContent: "space-between",
                      marginLeft: 0,
                    }}
                  />
                </Box>
              )}
            </>
          )}
          {activeNavItem === "sync" && (
            <Box className="settings-tab-content">
              <Typography variant="body1" color="text.secondary">
                {t("settings.sync.empty") || "Sync settings coming soon"}
              </Typography>
            </Box>
          )}
        </Box>
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
    </main>
  );
}
