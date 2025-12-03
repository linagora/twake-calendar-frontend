import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { browserDefaultTimeZone } from "../../utils/timezone";
import { getOpenPaasUserDataAsync } from "../User/userSlice";

export interface SettingsState {
  language: string;
  timeZone: string;
  isBrowserDefaultTimeZone: boolean;
  view: "calendar" | "settings" | "search";
}

const savedLang = localStorage.getItem("lang");
const defaultLang = savedLang ?? (window as any).LANG ?? "en";

const savedTimeZone = localStorage.getItem("timeZone");
const defaultTimeZone = savedTimeZone ?? browserDefaultTimeZone ?? "UTC";
const isSavedTimeZoneBrowserDefault = savedTimeZone === browserDefaultTimeZone;

const initialState: SettingsState = {
  language: defaultLang,
  timeZone: defaultTimeZone,
  isBrowserDefaultTimeZone: isSavedTimeZoneBrowserDefault,
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
        localStorage.setItem("timeZone", timeZone);
        if (timeZone === browserDefaultTimeZone) {
          state.isBrowserDefaultTimeZone = true;
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
} = settingsSlice.actions;
export default settingsSlice.reducer;
