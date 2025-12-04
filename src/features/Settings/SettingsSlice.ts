import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { browserDefaultTimeZone } from "../../utils/timezone";
import { getOpenPaasUserDataAsync } from "../User/userSlice";

export interface SettingsState {
  language: string;
  timeZone: string | null; // Allow null to represent browser default
  isBrowserDefaultTimeZone: boolean;
  hideDeclinedEvents: boolean | null;
  view: "calendar" | "settings" | "search";
}

const savedLang = localStorage.getItem("lang");
const defaultLang = savedLang ?? (window as any).LANG ?? "en";

const savedTimeZone = localStorage.getItem("timeZone");
// If savedTimeZone is the string "null" or doesn't exist, use null
const defaultTimeZone =
  savedTimeZone === "null" || !savedTimeZone ? null : savedTimeZone;

const initialState: SettingsState = {
  language: defaultLang,
  timeZone: defaultTimeZone,
  isBrowserDefaultTimeZone: defaultTimeZone === null,
  hideDeclinedEvents: null,
  view: "calendar",
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
    setHideDeclinedEvents: (state, action: PayloadAction<boolean>) => {
      state.hideDeclinedEvents = action.payload;
    },
    setView: (
      state,
      action: PayloadAction<"calendar" | "settings" | "search">
    ) => {
      state.view = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getOpenPaasUserDataAsync.fulfilled, (state, action) => {
      const coreModule = action.payload.configurations?.modules?.find(
        (module: any) => module.name === "core"
      );
      const datetimeConfig = coreModule?.configurations?.find(
        (config: any) => config.name === "datetime"
      );
      const timeZone = datetimeConfig?.value?.timeZone;

      if (timeZone) {
        state.timeZone = timeZone;
        state.isBrowserDefaultTimeZone = false;
        localStorage.setItem("timeZone", timeZone);
      } else {
        state.timeZone = browserDefaultTimeZone;
        state.isBrowserDefaultTimeZone = true;
        localStorage.setItem("timeZone", browserDefaultTimeZone);
      }

      const calendarModule = action.payload.configurations?.modules?.find(
        (module: any) => module.name === "linagora.esn.calendar"
      );
      const hideDeclinedEvents = calendarModule?.configurations?.find(
        (config: any) => config.name === "hideDeclinedEvents"
      );
      state.hideDeclinedEvents = hideDeclinedEvents.value;
    });
  },
});

export const {
  setLanguage,
  setTimeZone,
  setView,
  setIsBrowserDefaultTimeZone,
  setHideDeclinedEvents,
} = settingsSlice.actions;
export default settingsSlice.reducer;
