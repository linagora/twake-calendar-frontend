import { RootState } from "@/app/store";
import { createSelector } from "@reduxjs/toolkit";

export const selectCalendars = createSelector(
  (state: RootState) => state.calendars.list,
  (list) => Object.values(list)
);
