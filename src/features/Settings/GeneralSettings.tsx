import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { useTimeZoneList } from "@/components/Calendar/TimezoneSelector";
import { WeekDaySelector } from "@/components/Event/WeekDaySelector";
import { TimezoneAutocomplete } from "@/components/Timezone/TimezoneAutocomplete";
import { browserDefaultTimeZone, getTimezoneOffset } from "@/utils/timezone";
import {
  Box,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Switch,
  Typography,
} from "@linagora/twake-mui";
import { useRef, useCallback, useEffect } from "react";
import { useI18n } from "twake-i18n";
import {
  setLanguage as setUserLanguage,
  setTimezone as setUserTimeZone,
  updateUserConfigurationsAsync,
} from "../User/userSlice";
import { AVAILABLE_LANGUAGES } from "./constants";
import {
  BusinessHour,
  setBusinessHours,
  setDisplayWeekNumbers,
  setHideDeclinedEvents,
  setIsBrowserDefaultTimeZone,
  setLanguage as setSettingsLanguage,
  setTimeZone as setSettingsTimeZone,
  setWorkingDays,
} from "./SettingsSlice";

interface GeneralSettingsProps {
  onLanguageError: () => void;
  onTimeZoneError: () => void;
  onHideDeclinedEventsError: () => void;
  onDisplayWeekNumbersError: () => void;
  onWorkingDaysError: () => void;
}

export function GeneralSettings({
  onLanguageError,
  onTimeZoneError,
  onHideDeclinedEventsError,
  onDisplayWeekNumbersError,
  onWorkingDaysError,
}: GeneralSettingsProps) {
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

  const hideDeclinedEvents = useAppSelector(
    (state) => state.settings?.hideDeclinedEvents
  );
  const displayWeekNumbers = useAppSelector(
    (state) => state.settings?.displayWeekNumbers
  );
  const workingDays = useAppSelector((state) => state.settings.workingDays);
  const businessHours = useAppSelector((state) => state.settings.businessHours);
  const pendingBusinessHoursRef = useRef<BusinessHour | null>(null);
  const businessHoursTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLanguage = event.target.value;
    const previousLanguage = currentLanguage;
    dispatch(setUserLanguage(newLanguage));
    dispatch(setSettingsLanguage(newLanguage));
    dispatch(updateUserConfigurationsAsync({ language: newLanguage }))
      .unwrap()
      .catch(() => {
        dispatch(setUserLanguage(previousLanguage));
        dispatch(setSettingsLanguage(previousLanguage));
        onLanguageError();
      });
  };

  const handleTimeZoneChange = (newTimeZone: string) => {
    const previousTimeZone = currentTimeZone;
    dispatch(setUserTimeZone(newTimeZone));
    dispatch(setSettingsTimeZone(newTimeZone));
    dispatch(
      updateUserConfigurationsAsync({ timezone: newTimeZone, previousConfig })
    )
      .unwrap()
      .catch(() => {
        dispatch(setUserTimeZone(previousTimeZone));
        dispatch(setSettingsTimeZone(previousTimeZone));
        onTimeZoneError();
      });
  };

  const handleTimeZoneDefaultChange = (isDefault: boolean) => {
    const previousTimeZone = currentTimeZone;
    dispatch(setIsBrowserDefaultTimeZone(isDefault));
    if (isDefault) {
      dispatch(setUserTimeZone(null));
      dispatch(setSettingsTimeZone(browserDefaultTimeZone));
      dispatch(
        updateUserConfigurationsAsync({ timezone: null, previousConfig })
      )
        .unwrap()
        .catch(() => {
          dispatch(setUserTimeZone(previousTimeZone));
          dispatch(setSettingsTimeZone(previousTimeZone));
          dispatch(setIsBrowserDefaultTimeZone(!isDefault));
          onTimeZoneError();
        });
    }
  };

  const handleHideDeclinedEvents = (value: boolean) => {
    dispatch(setHideDeclinedEvents(value));
    dispatch(updateUserConfigurationsAsync({ hideDeclinedEvents: value }))
      .unwrap()
      .catch(() => {
        dispatch(setHideDeclinedEvents(!value));
        onHideDeclinedEventsError();
      });
  };

  const handleDisplayWeekNumbers = (value: boolean) => {
    dispatch(setDisplayWeekNumbers(value));
    dispatch(updateUserConfigurationsAsync({ displayWeekNumbers: value }))
      .unwrap()
      .catch(() => {
        dispatch(setDisplayWeekNumbers(!value));
        onDisplayWeekNumbersError();
      });
  };

  const handleBusinessHour = useCallback(
    ({ days }: { days: number[] }) => {
      const previousHours = businessHours;
      const value: BusinessHour | null = businessHours
        ? { ...businessHours, daysOfWeek: days }
        : null;

      dispatch(setBusinessHours(value));
      pendingBusinessHoursRef.current = value;

      if (businessHoursTimeoutRef.current) {
        clearTimeout(businessHoursTimeoutRef.current);
      }

      businessHoursTimeoutRef.current = setTimeout(() => {
        dispatch(
          updateUserConfigurationsAsync({
            businessHours: pendingBusinessHoursRef.current,
          })
        )
          .unwrap()
          .catch(() => {
            dispatch(setBusinessHours(previousHours));
            onWorkingDaysError();
          });
      }, 500);
    },
    [businessHours, dispatch, onWorkingDaysError]
  );

  useEffect(() => {
    return () => {
      if (businessHoursTimeoutRef.current) {
        clearTimeout(businessHoursTimeoutRef.current);
      }
    };
  }, []);

  const handleWorkingDays = (value: boolean) => {
    dispatch(setWorkingDays(value));
    dispatch(updateUserConfigurationsAsync({ workingDays: value }))
      .unwrap()
      .catch(() => {
        dispatch(setWorkingDays(!value));
        onWorkingDaysError();
      });
  };

  return (
    <Box className="settings-tab-content">
      {/* Language */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t("settings.language") || "Language"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t("settings.languageDescription") ||
            "This will be the language used in your Twake Calendar"}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 500 }}>
          <Select
            value={currentLanguage}
            onChange={handleLanguageChange}
            variant="outlined"
            aria-label={t("settings.languageSelector") || "Language selector"}
          >
            {AVAILABLE_LANGUAGES.map(({ code, label }) => (
              <MenuItem key={code} value={code}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Timezone */}
      <Box
        sx={{
          mb: 4,
        }}
      >
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t("settings.timeZone")}
        </Typography>
        <Box>
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

      {/* Working  */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t("settings.chooseWorkingDays")}
        </Typography>
        <WeekDaySelector
          selectedDays={businessHours?.daysOfWeek ?? []}
          onChange={(days) => handleBusinessHour({ days })}
        />
        <FormControl size="small" sx={{ minWidth: 500, mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(workingDays)}
                onChange={() => handleWorkingDays(!workingDays)}
              />
            }
            label={t("settings.showOnlyWorkingDays")}
            labelPlacement="start"
            sx={{
              minWidth: 400,
              justifyContent: "space-between",
              marginLeft: 0,
            }}
          />
        </FormControl>
      </Box>

      {/* Calendar & Events */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t("settings.calAndEvent")}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 500 }}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(!hideDeclinedEvents)}
                onChange={() => handleHideDeclinedEvents(!hideDeclinedEvents)}
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
                onChange={() => handleDisplayWeekNumbers(!displayWeekNumbers)}
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
  );
}
