import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SettingsState {
  language: string;
  timeZone: string;
  view: "calendar" | "settings" | "search";
}

const savedLang = localStorage.getItem("lang");
const defaultLang = savedLang ?? (window as any).LANG ?? "en";

const savedTimeZone = localStorage.getItem("TimeZone");
const defaultTimeZone =
  savedTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";

const initialState: SettingsState = {
  language: defaultLang,
  timeZone: defaultTimeZone,
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
    setView: (
      state,
      action: PayloadAction<"calendar" | "settings" | "search">
    ) => {
      state.view = action.payload;
    },
  },
});

export const { setLanguage, setTimeZone, setView } = settingsSlice.actions;
export default settingsSlice.reducer;
