import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SettingsState {
  language: string;
  view: "calendar" | "settings" | "search";
}

const savedLang = localStorage.getItem("lang");
const defaultLang = savedLang ?? (window as any).LANG ?? "en";

const initialState: SettingsState = {
  language: defaultLang,
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
    setView: (
      state,
      action: PayloadAction<"calendar" | "settings" | "search">
    ) => {
      state.view = action.payload;
    },
  },
});

export const { setLanguage, setView } = settingsSlice.actions;
export default settingsSlice.reducer;
