import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Calendars } from "./CalendarTypes";
import { CalendarEvent } from "../Events/EventsTypes";
import {
  addSharedCalendar,
  getCalendar,
  getCalendars,
  postCalendar,
  proppatchCalendar,
  removeCalendar,
  updateAclCalendar,
} from "./CalendarApi";
import { getOpenPaasUser, getUserDetails } from "../User/userAPI";
import { parseCalendarEvent } from "../Events/eventUtils";
import {
  deleteEvent,
  getEvent,
  importEventFromFile,
  moveEvent,
  putEvent,
} from "../Events/EventApi";
import {
  computeWeekRange,
  formatDateToYYYYMMDDTHHMMSS,
} from "../../utils/dateUtils";
import { User } from "../../components/Attendees/PeopleSearch";
import { getCalendarVisibility } from "../../components/Calendar/utils/calendarUtils";
import { importFile } from "../../utils/apiUtils";

export const getCalendarsListAsync = createAsyncThunk<
  Record<string, Calendars> // Return type
>("calendars/getCalendars", async () => {
  const importedCalendars: Record<string, Calendars> = {};
  const user = (await getOpenPaasUser()) as Record<string, string>;
  const calendars = (await getCalendars(user.id)) as Record<string, any>;
  const rawCalendars = calendars._embedded["dav:calendar"];

  for (const cal of rawCalendars) {
    const name = cal["dav:name"];
    const description = cal["caldav:description"];
    let delegated = false;
    let source = cal["calendarserver:source"]
      ? cal["calendarserver:source"]._links.self.href
      : cal._links.self.href;
    const link = cal._links.self.href;
    if (cal["calendarserver:delegatedsource"]) {
      source = cal["calendarserver:delegatedsource"];
      delegated = true;
    }
    const id = source.replace("/calendars/", "").replace(".json", "");
    const visibility = getCalendarVisibility(cal["acl"]);
    const ownerData: any = await getUserDetails(id.split("/")[0]);
    const color = cal["apple:color"];
    importedCalendars[id] = {
      id,
      name,
      link,
      owner: `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${
        ownerData.lastname
      }`,
      ownerEmails: ownerData.emails,
      description,
      delegated,
      color,
      visibility,
      events: {},
    };
  }

  return importedCalendars;
});

export const getTempCalendarsListAsync = createAsyncThunk<
  Record<string, Calendars>,
  User
>("calendars/getTempCalendars", async (tempUser) => {
  const importedCalendars: Record<string, Calendars> = {};

  const calendars = (await getCalendars(
    tempUser.openpaasId ?? "",
    "sharedPublic=true&WithRights=true"
  )) as Record<string, any>;
  const rawCalendars = calendars._embedded["dav:calendar"];

  for (const cal of rawCalendars) {
    const name = cal["dav:name"];
    const description = cal["caldav:description"];
    const delegated = cal["calendarserver:delegatedsource"] ? true : false;
    const source = cal["calendarserver:source"]
      ? cal["calendarserver:source"]._links.self.href
      : cal._links.self.href;
    const link = cal._links.self.href;

    const id = source.replace("/calendars/", "").replace(".json", "");
    const visibility = getCalendarVisibility(cal["acl"]);
    const ownerData: any = await getUserDetails(id.split("/")[0]);

    importedCalendars[id] = {
      id,
      name,
      link,
      owner: `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${ownerData.lastname}`,
      ownerEmails: ownerData.emails,
      description,
      delegated,
      color: tempUser.color ?? "#a8a8a8ff",
      visibility,
      events: {},
    };
  }

  return importedCalendars;
});

export const getCalendarDetailAsync = createAsyncThunk<
  { calId: string; events: CalendarEvent[]; calType?: string }, // Return type
  { calId: string; match: { start: string; end: string }; calType?: string } // Arg type
>("calendars/getCalendarDetails", async ({ calId, match, calType }) => {
  const calendar = (await getCalendar(calId, match)) as Record<string, any>;
  const color = calendar["apple:color"];
  const events: CalendarEvent[] = calendar._embedded["dav:item"].flatMap(
    (eventdata: any) => {
      const vevents = eventdata.data[2] as any[][]; // array of ['vevent', RawEntry[], []]
      const valarm = eventdata.data[2][0][2][0];
      const eventURL = eventdata._links.self.href;
      return vevents.map((vevent: any[]) => {
        return parseCalendarEvent(vevent[1], color, calId, eventURL, valarm);
      });
    }
  );

  return { calId, events, calType };
});

export const putEventAsync = createAsyncThunk<
  { calId: string; events: CalendarEvent[]; calType?: "temp" }, // Return type
  { cal: Calendars; newEvent: CalendarEvent; calType?: "temp" } // Arg type
>("calendars/putEvent", async ({ cal, newEvent, calType }) => {
  await putEvent(newEvent, cal.ownerEmails ? cal.ownerEmails[0] : undefined);
  const eventDate = new Date(newEvent.start);

  // Calculate week range based on Monday as first day (consistent with FullCalendar firstDay={1})
  const { start: weekStart, end: weekEnd } = computeWeekRange(eventDate);

  const calEvents = (await getCalendar(cal.id, {
    start: formatDateToYYYYMMDDTHHMMSS(weekStart),
    end: formatDateToYYYYMMDDTHHMMSS(weekEnd),
  })) as Record<string, any>;
  const events: CalendarEvent[] = calEvents._embedded["dav:item"].flatMap(
    (eventdata: any) => {
      const vevents = eventdata.data[2] as any[][];
      const eventURL = eventdata._links.self.href;
      const valarm = eventdata.data[2][0][2][0];
      return vevents.map((vevent: any[]) => {
        return parseCalendarEvent(
          vevent[1],
          cal.color ?? "",
          cal.id,
          eventURL,
          valarm
        );
      });
    }
  );

  return {
    calId: cal.id,
    events,
    calType,
  };
});

export const getEventAsync = createAsyncThunk<
  { calId: string; event: CalendarEvent }, // Return type
  CalendarEvent // Arg type
>("calendars/getEvent", async (event) => {
  const response: CalendarEvent = await getEvent(event);
  return {
    calId: event.calId,
    event: response,
  };
});
export const patchCalendarAsync = createAsyncThunk<
  {
    calId: string;
    calLink: string;
    patch: { name: string; desc: string; color: string };
  }, // Return type
  {
    calId: string;
    calLink: string;
    patch: { name: string; desc: string; color: string };
  } // Arg type
>("calendars/patchCalendar", async ({ calId, calLink, patch }) => {
  await proppatchCalendar(calLink, patch);
  return {
    calId,
    calLink,
    patch,
  };
});

export const removeCalendarAsync = createAsyncThunk<
  {
    calId: string;
  },
  {
    calId: string;
    calLink: string;
  }
>("calendars/removeCalendar", async ({ calId, calLink }) => {
  await removeCalendar(calLink);
  return {
    calId,
    calLink,
  };
});

export const moveEventAsync = createAsyncThunk<
  { calId: string; events: CalendarEvent[] }, // Return type
  { cal: Calendars; newEvent: CalendarEvent; newURL: string } // Arg type
>("calendars/moveEvent", async ({ cal, newEvent, newURL }) => {
  await moveEvent(newEvent, newURL);

  // Calculate week range based on Monday as first day (consistent with FullCalendar firstDay={1})
  const eventDate = new Date(newEvent.start);
  const { start: weekStart, end: weekEnd } = computeWeekRange(eventDate);

  const calEvents = (await getCalendar(cal.id, {
    start: formatDateToYYYYMMDDTHHMMSS(weekStart),
    end: formatDateToYYYYMMDDTHHMMSS(weekEnd),
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

export const patchACLCalendarAsync = createAsyncThunk<
  {
    calId: string;
    calLink: string;
    request: string;
  }, // Return type
  {
    calId: string;
    calLink: string;
    request: string;
  } // Arg type
>("calendars/requestACLCalendar", async ({ calId, calLink, request }) => {
  const response = await updateAclCalendar(calLink, request);
  return {
    calId,
    calLink,
    request,
  };
});

export const deleteEventAsync = createAsyncThunk<
  { calId: string; eventId: string }, // Return type
  { calId: string; eventId: string; eventURL: string } // Arg type
>("calendars/delEvent", async ({ calId, eventId, eventURL }) => {
  await deleteEvent(eventURL);
  return { calId, eventId };
});

export const createCalendarAsync = createAsyncThunk<
  {
    userId: string;
    calId: string;
    color: string;
    name: string;
    desc: string;
    owner: string;
    ownerEmails: string[];
  }, // Return type
  { userId: string; calId: string; color: string; name: string; desc: string } // Arg type
>("calendars/createCalendar", async ({ userId, calId, color, name, desc }) => {
  await postCalendar(userId, calId, color, name, desc);
  const ownerData: any = await getUserDetails(userId.split("/")[0]);

  return {
    userId,
    calId,
    color,
    name,
    desc,
    owner: `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${
      ownerData.lastname
    }`,
    ownerEmails: ownerData.emails,
  };
});

export const addSharedCalendarAsync = createAsyncThunk<
  {
    calId: string;
    color: string;
    link: string;
    name: string;
    desc: string;
    owner: string;
    ownerEmails: string[];
  }, // Return type
  { userId: string; calId: string; cal: Record<string, any> } // Arg type
>("calendars/addSharedCalendar", async ({ userId, calId, cal }) => {
  await addSharedCalendar(userId, calId, cal);
  const ownerData: any = await getUserDetails(
    cal.cal._links.self.href
      .replace("/calendars/", "")
      .replace(".json", "")
      .split("/")[0]
  );

  return {
    calId: cal.cal._links.self.href
      .replace("/calendars/", "")
      .replace(".json", ""),
    color: cal.cal["apple:color"],
    link: `/calendars/${userId}/${calId}.json`,
    desc: cal.cal["caldav:description"],
    name: cal.cal["dav:name"],
    owner: `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${
      ownerData.lastname
    }`,
    ownerEmails: ownerData.emails,
  };
});

export const importEventFromFileAsync = createAsyncThunk<
  void,
  {
    calLink: string;
    file: File;
  }
>("calendars/importEvent", async ({ calLink, file }) => {
  const id = ((await importFile(file)) as Record<string, string>)._id;
  const response = await importEventFromFile(id, calLink);
});

const CalendarSlice = createSlice({
  name: "calendars",
  initialState: {
    list: {} as Record<string, Calendars>,
    templist: {} as Record<string, Calendars>,
    pending: false,
  },
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
    removeTempCal: (state, action: PayloadAction<string>) => {
      delete state.templist[action.payload];
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
          state.list = action.payload;
        }
      )
      .addCase(
        getTempCalendarsListAsync.fulfilled,
        (state, action: PayloadAction<Record<string, Calendars>>) => {
          state.pending = false;
          Object.keys(action.payload).forEach(
            (id) => (state.templist[id] = action.payload[id])
          );
        }
      )
      .addCase(
        getCalendarDetailAsync.fulfilled,
        (
          state,
          action: PayloadAction<{
            calId: string;
            events: CalendarEvent[];
            calType?: string;
          }>
        ) => {
          state.pending = false;
          const type = action.payload.calType === "temp" ? "templist" : "list";

          if (!state[type][action.payload.calId]) {
            state[type][action.payload.calId] = {
              id: action.payload.calId,
              events: {},
            } as Calendars;
          }
          action.payload.events.forEach((event) => {
            state[type][action.payload.calId].events[event.uid] = event;
          });
          Object.keys(state[type][action.payload.calId].events).forEach(
            (id) => {
              state[type][action.payload.calId].events[id].color =
                state[type][action.payload.calId].color;
              state[type][action.payload.calId].events[id].calId =
                action.payload.calId;
              state[type][action.payload.calId].events[id].timezone =
                Intl.DateTimeFormat().resolvedOptions().timeZone;
            }
          );
        }
      )
      .addCase(
        putEventAsync.fulfilled,
        (
          state,
          action: PayloadAction<{
            calId: string;
            events: CalendarEvent[];
            calType?: "temp";
          }>
        ) => {
          state.pending = false;
          const type = action.payload.calType === "temp" ? "templist" : "list";

          if (!state[type][action.payload.calId]) {
            state[type][action.payload.calId] = {
              id: action.payload.calId,
              events: {},
            } as Calendars;
          }
          action.payload.events.forEach((event) => {
            state[type][action.payload.calId].events[event.uid] = event;
          });
          Object.keys(state[type][action.payload.calId].events).forEach(
            (id) => {
              state[type][action.payload.calId].events[id].color =
                state[type][action.payload.calId].color;
              state[type][action.payload.calId].events[id].calId =
                action.payload.calId;
              state[type][action.payload.calId].events[id].timezone =
                Intl.DateTimeFormat().resolvedOptions().timeZone;
            }
          );
        }
      )
      .addCase(
        getEventAsync.fulfilled,
        (
          state,
          action: PayloadAction<{ calId: string; event: CalendarEvent }>
        ) => {
          state.pending = false;
          if (!state.list[action.payload.calId]) {
            state.list[action.payload.calId] = {
              id: action.payload.calId,
              events: {},
            } as Calendars;
          }

          state.list[action.payload.calId].events[action.payload.event.uid] =
            action.payload.event;
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
        const [baseId, recurrenceId] = action.payload.eventId.split("/");
        if (recurrenceId) {
          Object.keys(state.list[action.payload.calId].events).forEach(
            (element) => {
              if (element.split("/")[0] === baseId) {
                delete state.list[action.payload.calId].events[element];
              }
            }
          );
        } else {
          delete state.list[action.payload.calId].events[
            action.payload.eventId
          ];
        }
      })
      .addCase(createCalendarAsync.fulfilled, (state, action) => {
        state.pending = false;
        state.list[`${action.payload.userId}/${action.payload.calId}`] = {
          color: action.payload.color,
          id: `${action.payload.userId}/${action.payload.calId}`,
          link: `/calendars/${action.payload.userId}/${action.payload.calId}.json`,
          description: action.payload.desc,
          name: action.payload.name,
          owner: action.payload.owner,
          ownerEmails: action.payload.ownerEmails,
          events: {},
        } as Calendars;
      })
      .addCase(patchCalendarAsync.fulfilled, (state, action) => {
        state.pending = false;
        if (action.payload.patch.color) {
          state.list[action.payload.calId] = {
            ...state.list[action.payload.calId],
            color: action.payload.patch.color,
          };
          Object.keys(state.list[action.payload.calId].events).forEach(
            (evId) =>
              (state.list[action.payload.calId].events[evId].color =
                action.payload.patch.color)
          );
        }
        if (action.payload.patch.desc) {
          state.list[action.payload.calId] = {
            ...state.list[action.payload.calId],
            description: action.payload.patch.desc,
          };
        }
        if (action.payload.patch.name) {
          state.list[action.payload.calId] = {
            ...state.list[action.payload.calId],
            name: action.payload.patch.name,
          };
        }
      })
      .addCase(addSharedCalendarAsync.fulfilled, (state, action) => {
        state.pending = false;
        state.list[action.payload.calId] = {
          color: action.payload.color,
          id: action.payload.calId,
          link: action.payload.link,
          description: action.payload.desc,
          name: action.payload.name,
          events: {},
          owner: action.payload.owner,
          ownerEmails: action.payload.ownerEmails,
        } as Calendars;
      })
      .addCase(removeCalendarAsync.fulfilled, (state, action) => {
        state.pending = false;
        delete state.list[action.payload.calId];
      })
      .addCase(patchACLCalendarAsync.fulfilled, (state, action) => {
        state.pending = false;
        state.list[action.payload.calId].visibility =
          action.payload.request !== "" ? "public" : "private";
      })
      .addCase(getCalendarDetailAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(getEventAsync.pending, (state) => {
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
      })
      .addCase(patchCalendarAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(createCalendarAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(getTempCalendarsListAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(addSharedCalendarAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(removeCalendarAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(patchACLCalendarAsync.pending, (state) => {
        state.pending = true;
      });
  },
});

export const {
  addEvent,
  removeEvent,
  createCalendar,
  updateEventLocal,
  removeTempCal,
} = CalendarSlice.actions;
export default CalendarSlice.reducer;
