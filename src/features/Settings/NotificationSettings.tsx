import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { FormControlLabel, Switch, Typography, Box } from "@linagora/twake-mui";
import React from "react";
import { useI18n } from "twake-i18n";
import {
  setAlarmEmails,
  updateUserConfigurationsAsync,
} from "../User/userSlice";

interface NotificationsSettingsProps {
  onAlarmEmailsError: () => void;
}

export function NotificationsSettings({
  onAlarmEmailsError,
}: NotificationsSettingsProps) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const alarmEmailsEnabled = useAppSelector(
    (state) => state.user?.alarmEmailsEnabled ?? true
  );

  const handleAlarmEmailsToggle = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.checked;
    const previousValue = alarmEmailsEnabled;
    dispatch(setAlarmEmails(newValue));
    dispatch(updateUserConfigurationsAsync({ alarmEmails: newValue }))
      .unwrap()
      .catch(() => {
        dispatch(setAlarmEmails(previousValue));
        onAlarmEmailsError();
      });
  };

  return (
    <Box className="settings-tab-content">
      <Typography variant="h6" sx={{ mb: 3 }}>
        {t("settings.notifications.deliveryMethod")}
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={alarmEmailsEnabled}
            onChange={handleAlarmEmailsToggle}
          />
        }
        label={t("settings.notifications.email")}
        labelPlacement="start"
        sx={{ minWidth: 400, justifyContent: "space-between", marginLeft: 0 }}
      />
    </Box>
  );
}
