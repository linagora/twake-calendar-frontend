import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Calendars } from "./CalendarTypes";
import { CalendarEvent } from "../Events/EventsTypes";

const CalendarSlice = createSlice({
  name: "calendars",
  initialState: {} as Record<string, Calendars>,
  reducers: {
    createCalendar: (state, action: PayloadAction<Record<string, string>>) => {
      const id = Date.now().toString(36);
      state[id] = {} as Calendars;
      state[id].name = action.payload.name;
      state[id].color = action.payload.color;
      state[id].description = action.payload.description;
      state[id].events = [];
    },
    addEvent: (
      state,
      action: PayloadAction<{ calendarUid: string; event: CalendarEvent }>
    ) => {
      console.log(action.payload)
      if (!state[action.payload.calendarUid].events) {
        state[action.payload.calendarUid].events = [];
      }
      state[action.payload.calendarUid].events.push(action.payload.event);
    },
    removeEvent: (
      state,
      action: PayloadAction<{ calendarUid: string; eventUid: string }>
    ) => {
      state[action.payload.calendarUid as string].events = state[
        action.payload.calendarUid
      ].events.filter((event) => {
        if (event.uid !== action.payload.calendarUid) {
          return event;
        }
      });
    },
  },
});

export const { addEvent, removeEvent, createCalendar } = CalendarSlice.actions;
export default CalendarSlice.reducer;
