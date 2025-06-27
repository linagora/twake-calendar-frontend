// store/eventsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CalendarEvent } from "./EventsTypes";

const eventsSlice = createSlice({
  name: "events",
  initialState: [] as CalendarEvent[],
  reducers: {
    addEvent: (state, action: PayloadAction<CalendarEvent>) => {
      state.push(action.payload);
    },
  },
});


export const { addEvent } = eventsSlice.actions;
export default eventsSlice.reducer;
