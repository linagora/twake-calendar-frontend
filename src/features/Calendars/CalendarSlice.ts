import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Calendars } from "./CalendarTypes";
import { CalendarEvent } from "../Events/EventsTypes";
import { getCalendar, getCalendars } from "./CalendarApi";
import { getOpenPaasUser, getUserDetails } from "../User/userAPI";
import { parseCalendarEvent } from "../Events/eventUtils";
import { deleteEvent, moveEvent, putEvent } from "../Events/EventApi";
import { formatDateToYYYYMMDDTHHMMSS } from "../../utils/dateUtils";

export const getCalendarsListAsync = createAsyncThunk<
  Record<string, Calendars> // Return type
>("calendars/getCalendars", async () => {
  const importedCalendars: Record<string, Calendars> = {};
  const user = (await getOpenPaasUser()) as Record<string, string>;
  const calendars = (await getCalendars(user.id)) as Record<string, any>;
  const rawCalendars = calendars._embedded["dav:calendar"];

  for (const cal of rawCalendars) {
    const name = cal["dav:name"];
    const description = cal["dav:description"];
    let delegated = false;
    let source = cal["calendarserver:source"]
      ? cal["calendarserver:source"]._links.self.href
      : cal._links.self.href;
    if (cal["calendarserver:delegatedsource"]) {
      source = cal["calendarserver:delegatedsource"];
      delegated = true;
    }
    const id = source.replace("/calendars/", "").replace(".json", "");

    const ownerData: any = await getUserDetails(id.split("/")[0]);
    const color = cal["apple:color"];
    importedCalendars[id] = {
      id,
      name,
      owner: `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${
        ownerData.lastname
      }`,
      ownerEmails: ownerData.emails,
      description,
      delegated,
      color,
      events: {},
    };
  }

  return importedCalendars;
});

export const getCalendarDetailAsync = createAsyncThunk<
  { calId: string; events: CalendarEvent[] }, // Return type
  { calId: string; match: { start: string; end: string } } // Arg type
>("calendars/getCalendarDetails", async ({ calId, match }) => {
  const calendar = (await getCalendar(calId, match)) as Record<string, any>;
  const color = calendar["apple:color"];
  const events: CalendarEvent[] = calendar._embedded["dav:item"].flatMap(
    (eventdata: any) => {
      const vevents = eventdata.data[2] as any[][]; // array of ['vevent', RawEntry[], []]
      const eventURL = eventdata._links.self.href;
      return vevents.map((vevent: any[]) => {
        return parseCalendarEvent(vevent[1], color, calId, eventURL);
      });
    }
  );

  return { calId, events };
});

export const putEventAsync = createAsyncThunk<
  { calId: string; events: CalendarEvent[] }, // Return type
  { cal: Calendars; newEvent: CalendarEvent } // Arg type
>("calendars/putEvent", async ({ cal, newEvent }) => {
  const response = await putEvent(newEvent);
  const calEvents = (await getCalendar(cal.id, {
    start: formatDateToYYYYMMDDTHHMMSS(new Date(newEvent.start)),
    end: formatDateToYYYYMMDDTHHMMSS(
      new Date(new Date(newEvent.start).getTime() + 86400000)
    ),
  })) as Record<string, any>;
  const events: CalendarEvent[] = calEvents._embedded["dav:item"].flatMap(
    (eventdata: any) => {
      const vevents = eventdata.data[2] as any[][];
      const eventURL = eventdata._links.self.href;
      return vevents.map((vevent: any[]) => {
        return parseCalendarEvent(vevent[1], cal.color ?? "", cal.id, eventURL);
      });
    }
  );

  return {
    calId: cal.id,
    events,
  };
});
export const moveEventAsync = createAsyncThunk<
  { calId: string; events: CalendarEvent[] }, // Return type
  { cal: Calendars; newEvent: CalendarEvent } // Arg type
>("calendars/moveEvent", async ({ cal, newEvent }) => {
  const response = await moveEvent(newEvent);
  const calEvents = (await getCalendar(cal.id, {
    start: formatDateToYYYYMMDDTHHMMSS(new Date(newEvent.start)),
    end: formatDateToYYYYMMDDTHHMMSS(
      new Date(new Date(newEvent.start).getTime() + 86400000)
    ),
  })) as Record<string, any>;
  const events: CalendarEvent[] = calEvents._embedded["dav:item"].flatMap(
    (eventdata: any) => {
      const vevents = eventdata.data[2] as any[][];
      const eventURL = eventdata._links.self.href;
      return vevents.map((vevent: any[]) => {
        return parseCalendarEvent(vevent[1], cal.color ?? "", cal.id, eventURL);
      });
    }
  );

  return {
    calId: cal.id,
    events,
  };
});

export const deleteEventAsync = createAsyncThunk<
  { calId: string; eventId: string }, // Return type
  { calId: string; eventId: string; eventURL: string } // Arg type
>("calendars/delEvent", async ({ calId, eventId, eventURL }) => {
  const response = await deleteEvent(eventURL);
  return { calId, eventId };
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
      state.list[id].events = {};
    },
    addEvent: (
      state,
      action: PayloadAction<{ calendarUid: string; event: CalendarEvent }>
    ) => {
      if (!state.list[action.payload.calendarUid].events) {
        state.list[action.payload.calendarUid].events = {};
      }
      state.list[action.payload.calendarUid].events[action.payload.event.uid] =
        action.payload.event;
      state.list[action.payload.calendarUid].events[
        action.payload.event.uid
      ].URL = `dav/calendars/${action.payload.calendarUid}/${
        action.payload.event.uid.split("/")[0]
      }.isc`;
    },
    removeEvent: (
      state,
      action: PayloadAction<{ calendarUid: string; eventUid: string }>
    ) => {
      delete state.list[action.payload.calendarUid].events[
        action.payload.eventUid
      ];
    },
    updateEventLocal: (
      state,
      action: PayloadAction<{ calId: string; event: CalendarEvent }>
    ) => {
      const { calId, event } = action.payload;
      state.list[calId].events[event.uid] = event;
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
              events: {},
            } as Calendars;
          }
          action.payload.events.forEach((event) => {
            state.list[action.payload.calId].events[event.uid] = event;
          });
          Object.keys(state.list[action.payload.calId].events).forEach((id) => {
            state.list[action.payload.calId].events[id].color =
              state.list[action.payload.calId].color;
            state.list[action.payload.calId].events[id].calId =
              action.payload.calId;
            state.list[action.payload.calId].events[id].timezone =
              Intl.DateTimeFormat().resolvedOptions().timeZone;
          });
        }
      )
      .addCase(
        putEventAsync.fulfilled,
        (
          state,
          action: PayloadAction<{ calId: string; events: CalendarEvent[] }>
        ) => {
          state.pending = false;
          if (!state.list[action.payload.calId]) {
            state.list[action.payload.calId] = {
              id: action.payload.calId,
              events: {},
            } as Calendars;
          }
          action.payload.events.forEach((event) => {
            state.list[action.payload.calId].events[event.uid] = event;
          });
          Object.keys(state.list[action.payload.calId].events).forEach((id) => {
            state.list[action.payload.calId].events[id].color =
              state.list[action.payload.calId].color;
            state.list[action.payload.calId].events[id].calId =
              action.payload.calId;
            state.list[action.payload.calId].events[id].timezone =
              Intl.DateTimeFormat().resolvedOptions().timeZone;
          });
        }
      )
      .addCase(
        moveEventAsync.fulfilled,
        (
          state,
          action: PayloadAction<{ calId: string; events: CalendarEvent[] }>
        ) => {
          state.pending = false;
          if (!state.list[action.payload.calId]) {
            state.list[action.payload.calId] = {
              id: action.payload.calId,
              events: {},
            } as Calendars;
          }
          action.payload.events.forEach((event) => {
            state.list[action.payload.calId].events[event.uid] = event;
          });
          Object.keys(state.list[action.payload.calId].events).forEach((id) => {
            state.list[action.payload.calId].events[id].color =
              state.list[action.payload.calId].color;
            state.list[action.payload.calId].events[id].calId =
              action.payload.calId;
            state.list[action.payload.calId].events[id].timezone =
              Intl.DateTimeFormat().resolvedOptions().timeZone;
          });
        }
      )
      .addCase(deleteEventAsync.fulfilled, (state, action) => {
        state.pending = false;
        delete state.list[action.payload.calId].events[action.payload.eventId];
      })
      .addCase(getCalendarDetailAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(getCalendarsListAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(putEventAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(moveEventAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(deleteEventAsync.pending, (state) => {
        state.pending = true;
      });
  },
});

export const { addEvent, removeEvent, createCalendar, updateEventLocal } =
  CalendarSlice.actions;
export default CalendarSlice.reducer;
