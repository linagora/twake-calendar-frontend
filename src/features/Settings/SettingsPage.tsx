import React, { useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SettingsIcon from "@mui/icons-material/Settings";
import SyncIcon from "@mui/icons-material/Sync";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setView, setLanguage as setSettingsLanguage } from "./SettingsSlice";
import {
  updateUserConfigurationsAsync,
  setLanguage as setUserLanguage,
} from "../User/userSlice";
import { AVAILABLE_LANGUAGES } from "./constants";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
import "./SettingsPage.styl";

type SidebarNavItem = "settings" | "sync";
type SettingsSubTab = "settings" | "notifications";

/**
 * Render the settings page UI with a sidebar, tabs for sub-settings, and a language selector.
 *
 * Renders a two-pane layout containing sidebar navigation (currently "Settings"), tabbed
 * sub-sections ("Settings" and "Notifications"), and a language selection control.
 * The component resolves the active language by preferring the user's language, then the
 * settings language, and finally falling back to `"en"`. Changing the language performs
 * an optimistic update to both user and settings slices and attempts to persist the
 * change in the background; if persistence fails, the previous language is restored.
 *
 * @returns The JSX element for the settings page UI
 */
export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const userLanguage = useAppSelector((state) => state.user?.language);
  const settingsLanguage = useAppSelector((state) => state.settings.language);
  const currentLanguage = userLanguage || settingsLanguage || "en";
  const [activeNavItem, setActiveNavItem] =
    useState<SidebarNavItem>("settings");
  const [activeSettingsSubTab, setActiveSettingsSubTab] =
    useState<SettingsSubTab>("settings");

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

  const handleLanguageChange = (event: any) => {
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
      });
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
            <ArrowBackIcon />
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
              )}
              {activeSettingsSubTab === "notifications" && (
                <Box className="settings-tab-content">
                  <Typography variant="body1" color="text.secondary">
                    {t("settings.notifications.empty") ||
                      "Notifications settings coming soon"}
                  </Typography>
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
    </main>
  );
}