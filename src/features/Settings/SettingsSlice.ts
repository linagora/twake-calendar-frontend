import { browserDefaultTimeZone } from "@/utils/timezone";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ConfigurationItem, ModuleConfiguration } from "../User/userDataTypes";
import { getOpenPaasUserDataAsync } from "../User/userSlice";

export interface SettingsState {
  language: string;
  timeZone: string | null; // Allow null to represent browser default
  isBrowserDefaultTimeZone: boolean;
  hideDeclinedEvents: boolean | null;
  displayWeekNumbers: boolean;
  view: "calendar" | "settings" | "search";
  businessHours: BusinessHour | null;
  workingDays: boolean | null;
}
export interface BusinessHour {
  start: string;
  end: string;
  daysOfWeek: number[];
}
const savedLang = localStorage.getItem("lang");
const defaultLang = savedLang ?? window.LANG ?? "en";

const savedTimeZone = localStorage.getItem("timeZone");
// If savedTimeZone is the string "null" or doesn't exist, use null
const defaultTimeZone =
  savedTimeZone === "null" || !savedTimeZone ? null : savedTimeZone;

const initialState: SettingsState = {
  language: defaultLang,
  timeZone: defaultTimeZone,
  isBrowserDefaultTimeZone: defaultTimeZone === null,
  hideDeclinedEvents: null,
  displayWeekNumbers: true,
  view: "calendar",
  businessHours: null,
  workingDays: null,
};

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      localStorage.setItem("lang", action.payload);
    },
    setTimeZone: (state, action: PayloadAction<string>) => {
      state.timeZone = action.payload;
      localStorage.setItem("timeZone", action.payload);
    },
    setIsBrowserDefaultTimeZone: (state, action: PayloadAction<boolean>) => {
      state.isBrowserDefaultTimeZone = action.payload;
    },
    setHideDeclinedEvents: (state, action: PayloadAction<boolean | null>) => {
      state.hideDeclinedEvents = action.payload;
    },
    setDisplayWeekNumbers: (state, action: PayloadAction<boolean>) => {
      state.displayWeekNumbers = action.payload;
    },
    setView: (
      state,
      action: PayloadAction<"calendar" | "settings" | "search">
    ) => {
      state.view = action.payload;
    },
    setBusinessHours: (state, action: PayloadAction<BusinessHour | null>) => {
      state.businessHours = action.payload ?? null;
    },
    setWorkingDays: (state, action: PayloadAction<boolean | null>) => {
      state.workingDays = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getOpenPaasUserDataAsync.fulfilled, (state, action) => {
      const coreModule = action.payload.configurations?.modules?.find(
        (module: ModuleConfiguration) => module.name === "core"
      );
      const datetimeConfig = coreModule?.configurations?.find(
        (config: ConfigurationItem) => config.name === "datetime"
      );
      const datetimeValue = datetimeConfig?.value as
        | { timeZone?: string }
        | undefined;
      const timeZone = datetimeValue?.timeZone;

      if (timeZone) {
        state.timeZone = timeZone;
        state.isBrowserDefaultTimeZone = false;
        localStorage.setItem("timeZone", timeZone);
      } else {
        state.timeZone = browserDefaultTimeZone;
        state.isBrowserDefaultTimeZone = true;
        localStorage.setItem("timeZone", browserDefaultTimeZone);
      }
      const esnCalendarModule = action.payload.configurations?.modules?.find(
        (module: ModuleConfiguration) => module.name === "linagora.esn.calendar"
      );
      const hideDeclinedEventsConfig = esnCalendarModule?.configurations?.find(
        (config: ConfigurationItem) => config.name === "hideDeclinedEvents"
      );
      state.hideDeclinedEvents =
        typeof hideDeclinedEventsConfig?.value === "boolean"
          ? hideDeclinedEventsConfig.value
          : null;

      const businessHoursConfig = coreModule?.configurations?.find(
        (config: ConfigurationItem) => config.name === "businessHours"
      );
      state.businessHours =
        Array.isArray(businessHoursConfig?.value) &&
        businessHoursConfig?.value?.[0]
          ? businessHoursConfig.value[0]
          : null;

      // From esnCalendarModule (alongside hideDeclinedEvents)
      const workingDaysConfig = esnCalendarModule?.configurations?.find(
        (config: ConfigurationItem) => config.name === "workingDays"
      );
      state.workingDays =
        typeof workingDaysConfig?.value === "boolean"
          ? workingDaysConfig.value
          : null;
      const calendarModule = action.payload.configurations?.modules?.find(
        (module: ModuleConfiguration) => module.name === "calendar"
      );
      if (calendarModule?.configurations) {
        const displayWeekNumbersConfig = calendarModule.configurations.find(
          (config: ConfigurationItem) => config.name === "displayWeekNumbers"
        );
        if (displayWeekNumbersConfig) {
          state.displayWeekNumbers = displayWeekNumbersConfig.value === true;
        }
      }
    });
  },
});

export const {
  setLanguage,
  setTimeZone,
  setView,
  setIsBrowserDefaultTimeZone,
  setHideDeclinedEvents,
  setDisplayWeekNumbers,
  setBusinessHours,
  setWorkingDays,
} = settingsSlice.actions;
export default settingsSlice.reducer;
