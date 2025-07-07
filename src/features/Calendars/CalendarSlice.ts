import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Calendars } from "./CalendarTypes";
import { CalendarEvent } from "../Events/EventsTypes";
import { getCalendar, getCalendars } from "./CalendarApi";
import getOpenPaasUserId from "../User/userAPI";
import { parseCalendarEvent } from "../Events/eventUtils";

export const getCalendarsListAsync = createAsyncThunk<
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
      : cal._links.self.href.replace("/calendars/", "").replace(".json", "");

    const color = cal["apple:color"];
    importedCalendars[id] = { id, name, description, color, events: [] };
  }

  return importedCalendars;
});

export const getCalendarDetailAsync = createAsyncThunk<
  { calId: string; events: CalendarEvent[] }, // Return type
  { access_token: string; calId: string } // Arg type
>("calendars/getCalendarDetails", async ({ access_token, calId }) => {
  const calendar = await getCalendar(calId, access_token);
  const color = calendar["apple:color"];
  const events: CalendarEvent[] = calendar._embedded["dav:item"].map(
    (eventdata: any) => {
      const datas = eventdata.data[2][0][1];
      return parseCalendarEvent(datas, color, calId);
    }
  );

  return { calId, events };
});

const CalendarSlice = createSlice({
  name: "calendars",
  initialState: { list: {} as Record<string, Calendars>, pending: false },
  reducers: {
    createCalendar: (state, action: PayloadAction<Record<string, string>>) => {
      const id = Date.now().toString(36);
      state.list[id] = {} as Calendars;
      state.list[id].name = action.payload.name;
      state.list[id].color = action.payload.color;
      state.list[id].description = action.payload.description;
      state.list[id].events = [];
    },
    addEvent: (
      state,
      action: PayloadAction<{ calendarUid: string; event: CalendarEvent }>
    ) => {
      if (!state.list[action.payload.calendarUid].events) {
        state.list[action.payload.calendarUid].events = [];
      }
      state.list[action.payload.calendarUid].events.push(action.payload.event);
    },
    removeEvent: (
      state,
      action: PayloadAction<{ calendarUid: string; eventUid: string }>
    ) => {
      state.list[action.payload.calendarUid as string].events = state.list[
        action.payload.calendarUid
      ].events.filter((event) => {
        if (event.uid !== action.payload.calendarUid) {
          return event;
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(
        getCalendarsListAsync.fulfilled,
        (state, action: PayloadAction<Record<string, Calendars>>) => {
          state.pending = false;
          Object.keys(action.payload).forEach((id) => {
            state.list[id] = action.payload[id];
          });
        }
      )
      .addCase(
        getCalendarDetailAsync.fulfilled,
        (
          state,
          action: PayloadAction<{ calId: string; events: CalendarEvent[] }>
        ) => {
          state.pending = false;
          if (!state.list[action.payload.calId]) {
            state.list[action.payload.calId] = {
              id: action.payload.calId,
              events: [] as CalendarEvent[],
            } as Calendars;
          }
          state.list[action.payload.calId].events = action.payload.events;
          state.list[action.payload.calId].events.forEach((event) => {
            event.color = state.list[action.payload.calId].color;
          });
        }
      )
      .addCase(getCalendarDetailAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(getCalendarsListAsync.pending, (state) => {
        state.pending = true;
      });
  },
});

export const { addEvent, removeEvent, createCalendar } = CalendarSlice.actions;
export default CalendarSlice.reducer;
