import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SettingsState {
  language: string;
}

const savedLang = localStorage.getItem("lang");
const defaultLang = savedLang ?? (window as any).LANG ?? "en";

const initialState: SettingsState = {
  language: defaultLang,
};

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      localStorage.setItem("lang", action.payload);
    },
  },
});

export const { setLanguage } = settingsSlice.actions;
export default settingsSlice.reducer;
