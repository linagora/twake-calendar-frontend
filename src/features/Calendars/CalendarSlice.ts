import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Calendars } from "./CalendarTypes";
import { CalendarEvent } from "../Events/EventsTypes";
import { getCalendar, getCalendars } from "./CalendarApi";
import getOpenPaasUserId from "../User/userAPI";
import { parseCalendarEvent } from "../Events/eventUtils";

export const getCalendarsAsync = createAsyncThunk<
  Record<string, Calendars>, // Return type
  string // Arg type (access_token)
>("calendars/getCalendars", async (access_token: string) => {
  const importedCalendars: Record<string, Calendars> = {};
  const user = await getOpenPaasUserId(access_token);
  const calendars = await getCalendars(user.id, access_token);
  const rawCalendars = calendars._embedded["dav:calendar"];

  for (const cal of rawCalendars) {
    const name = cal["dav:name"];
    const description = cal["dav:description"];
    const id = cal["calendarserver:source"]
      ? cal["calendarserver:source"]._links.self.href
          .replace("/calendars/", "")
          .replace(".json", "")
      : cal._links.self.href
          .replace("/calendars/", "")
          .replace(".json", "")

    const color = cal["apple:color"];
    const calendarDetails = await getCalendar(id, access_token);
    const events = calendarDetails._embedded["dav:item"].map(
      (eventdata: any) => {
        const datas = eventdata.data[2][0][1];
        return parseCalendarEvent(datas, color);
      }
    );

    importedCalendars[id] = { id, name, description, color, events };
  }

  return importedCalendars;
});

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
  extraReducers: (builder) => {
    builder.addCase(
      getCalendarsAsync.fulfilled,
      (state, action: PayloadAction<Record<string, Calendars>>) => {
        Object.keys(action.payload).forEach((id) => {
          state[id] = action.payload[id];
        });
      }
    );
  },
});

export const { addEvent, removeEvent, createCalendar } = CalendarSlice.actions;
export default CalendarSlice.reducer;
