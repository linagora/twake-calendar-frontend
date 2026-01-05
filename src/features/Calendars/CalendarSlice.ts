import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Calendar } from "./CalendarTypes";
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
  deleteEventInstance,
  getEvent,
  importEventFromFile,
  moveEvent,
  putEvent,
  putEventWithOverrides,
  updateSeries,
} from "../Events/EventApi";
import {
  computeWeekRange,
  formatDateToYYYYMMDDTHHMMSS,
} from "../../utils/dateUtils";
import { User } from "../../components/Attendees/PeopleSearch";
import { getCalendarVisibility } from "../../components/Calendar/utils/calendarUtils";
import { importFile } from "../../utils/apiUtils";
import { formatReduxError } from "../../utils/errorUtils";
import { browserDefaultTimeZone } from "../../utils/timezone";
import { getCalendarDetailAsync } from "./services/getCalendarDetailAsync";
import { refreshCalendarWithSyncToken } from "./services/refreshCalendar";
import { fetchSyncTokenChanges } from "./api/fetchSyncTokenChanges";

// Define error type for rejected actions
export interface RejectedError {
  message: string;
  status?: number;
}

export const getCalendarsListAsync = createAsyncThunk<
  { importedCalendars: Record<string, Calendar>; errors: string }, // Return type
  void, // Arg type
  { rejectValue: RejectedError; state: any } // ThunkAPI config
>("calendars/getCalendars", async (_, { rejectWithValue, getState }) => {
  const state = getState() as any;
  if (Object.keys(state.calendars.list).length > 0) {
    return {
      importedCalendars: state.calendars.list,
      errors: "",
    };
  }

  try {
    const importedCalendars: Record<string, Calendar> = {};
    const user = (await getOpenPaasUser()) as Record<string, string>;
    const calendars = (await getCalendars(user.id)) as Record<string, any>;
    const rawCalendars = calendars._embedded["dav:calendar"] as Record<
      string,
      any
    >[];
    const errors: string[] = [];

    const normalizedCalendars = rawCalendars.map((cal) => {
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
      const ownerId = id.split("/")[0];
      const visibility = getCalendarVisibility(cal["acl"]);
      return {
        cal,
        description,
        delegated,
        source,
        link,
        id,
        ownerId,
        visibility,
      };
    });

    const uniqueOwnerIds = Array.from(
      new Set(normalizedCalendars.map(({ ownerId }) => ownerId).filter(Boolean))
    );

    const ownerDataMap = new Map<string, any>();
    const OWNER_BATCH_SIZE = 20;

    const fetchOwnerData = async (ownerId: string) => {
      try {
        const data = await getUserDetails(ownerId);
        ownerDataMap.set(ownerId, data);
      } catch (error: any) {
        console.error(`Failed to fetch user details for ${ownerId}:`, error);
        ownerDataMap.set(ownerId, {
          firstname: "",
          lastname: "Unknown User",
          emails: [],
        });
        errors.push(formatReduxError(error));
      }
    };

    for (let i = 0; i < uniqueOwnerIds.length; i += OWNER_BATCH_SIZE) {
      const chunk = uniqueOwnerIds.slice(i, i + OWNER_BATCH_SIZE);
      await Promise.all(chunk.map((ownerId) => fetchOwnerData(ownerId)));
    }

    normalizedCalendars.forEach(
      ({ cal, description, delegated, link, id, ownerId, visibility }) => {
        const ownerData = ownerDataMap.get(ownerId) || {
          firstname: "",
          lastname: "Unknown User",
          emails: [],
        };
        const name =
          ownerId !== user.id && cal["dav:name"] === "#default"
            ? `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${
                ownerData.lastname
              }` + "'s calendar"
            : cal["dav:name"];

        const color = {
          light: cal["apple:color"] ?? "#006BD8",
          dark: cal["X-TWAKE-Dark-theme-color"] ?? "#FFF",
        };
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
    );

    return { importedCalendars, errors: errors.join("\n") };
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});

export const getTempCalendarsListAsync = createAsyncThunk<
  Record<string, Calendar>,
  User,
  { rejectValue: RejectedError }
>("calendars/getTempCalendars", async (tempUser, { rejectWithValue }) => {
  try {
    const importedCalendars: Record<string, Calendar> = {};

    const calendars = (await getCalendars(
      tempUser.openpaasId ?? "",
      "sharedPublic=true&"
    )) as Record<string, any>;

    const rawCalendars = calendars._embedded?.["dav:calendar"];
    if (!rawCalendars || rawCalendars.length === 0) {
      const userName = tempUser.displayName || tempUser.email || "User";
      // Format: TRANSLATION:key|param1=value1
      const encodedName = encodeURIComponent(userName);
      throw new Error(
        `TRANSLATION:calendar.userDoesNotHavePublicCalendars|name=${encodedName}`
      );
    }

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
        color: {
          light: tempUser.color?.light ?? "#a8a8a8ff",
          dark: tempUser.color?.dark ?? "#a8a8a8ff",
        },
        visibility,
        events: {},
      };
    }

    return importedCalendars;
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});

export const putEventAsync = createAsyncThunk<
  { calId: string; events: CalendarEvent[]; calType?: "temp" },
  { cal: Calendar; newEvent: CalendarEvent; calType?: "temp" },
  { rejectValue: RejectedError }
>(
  "calendars/putEvent",
  async ({ cal, newEvent, calType }, { rejectWithValue }) => {
    try {
      await putEvent(
        newEvent,
        cal.ownerEmails ? cal.ownerEmails[0] : undefined
      );
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
          const valarm = eventdata.data[2][0][2][0];
          return vevents.map((vevent: any[]) => {
            return parseCalendarEvent(
              vevent[1],
              cal.color ?? {},
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
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);

export const getEventAsync = createAsyncThunk<
  { calId: string; event: CalendarEvent },
  CalendarEvent,
  { rejectValue: RejectedError }
>("calendars/getEvent", async (event, { rejectWithValue }) => {
  try {
    const response: CalendarEvent = await getEvent(event);
    return {
      calId: event.calId,
      event: response,
    };
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});

export const patchCalendarAsync = createAsyncThunk<
  {
    calId: string;
    calLink: string;
    patch: { name: string; desc: string; color: Record<string, string> };
  },
  {
    calId: string;
    calLink: string;
    patch: { name: string; desc: string; color: Record<string, string> };
  },
  { rejectValue: RejectedError }
>(
  "calendars/patchCalendar",
  async ({ calId, calLink, patch }, { rejectWithValue }) => {
    try {
      await proppatchCalendar(calLink, patch);
      return {
        calId,
        calLink,
        patch,
      };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);

export const removeCalendarAsync = createAsyncThunk<
  {
    calId: string;
  },
  {
    calId: string;
    calLink: string;
  },
  { rejectValue: RejectedError }
>(
  "calendars/removeCalendar",
  async ({ calId, calLink }, { rejectWithValue }) => {
    try {
      await removeCalendar(calLink);
      return {
        calId,
        calLink,
      };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);

export const moveEventAsync = createAsyncThunk<
  { calId: string; events: CalendarEvent[] },
  { cal: Calendar; newEvent: CalendarEvent; newURL: string },
  { rejectValue: RejectedError }
>(
  "calendars/moveEvent",
  async ({ cal, newEvent, newURL }, { rejectWithValue }) => {
    try {
      await moveEvent(newEvent, newURL);

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
            return parseCalendarEvent(
              vevent[1],
              cal.color ?? {},
              cal.id,
              eventURL
            );
          });
        }
      );

      return {
        calId: cal.id,
        events,
      };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);

export const patchACLCalendarAsync = createAsyncThunk<
  {
    calId: string;
    calLink: string;
    request: string;
  },
  {
    calId: string;
    calLink: string;
    request: string;
  },
  { rejectValue: RejectedError }
>(
  "calendars/requestACLCalendar",
  async ({ calId, calLink, request }, { rejectWithValue }) => {
    try {
      const response = await updateAclCalendar(calLink, request);
      return {
        calId,
        calLink,
        request,
      };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);

export const deleteEventAsync = createAsyncThunk<
  { calId: string; eventId: string },
  { calId: string; eventId: string; eventURL: string },
  { rejectValue: RejectedError }
>(
  "calendars/delEvent",
  async ({ calId, eventId, eventURL }, { rejectWithValue }) => {
    try {
      await deleteEvent(eventURL);
      return { calId, eventId };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);

export const deleteEventInstanceAsync = createAsyncThunk<
  { calId: string; eventId: string },
  { cal: Calendar; event: CalendarEvent },
  { rejectValue: RejectedError }
>("calendars/delEventInstance", async ({ cal, event }, { rejectWithValue }) => {
  try {
    await deleteEventInstance(event, cal.ownerEmails?.[0]);
    return { calId: cal.id, eventId: event.uid };
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});

export const updateEventInstanceAsync = createAsyncThunk<
  { calId: string; event: CalendarEvent },
  { cal: Calendar; event: CalendarEvent },
  { rejectValue: RejectedError }
>(
  "calendars/updateEventInstance",
  async ({ cal, event }, { rejectWithValue }) => {
    try {
      await putEventWithOverrides(event, cal.ownerEmails?.[0]);
      return { calId: cal.id, event };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);

export const updateSeriesAsync = createAsyncThunk<
  void,
  { cal: Calendar; event: CalendarEvent; removeOverrides?: boolean },
  { rejectValue: RejectedError }
>(
  "calendars/updateSeries",
  async ({ cal, event, removeOverrides = true }, { rejectWithValue }) => {
    try {
      await updateSeries(event, cal.ownerEmails?.[0], removeOverrides);
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);

export const createCalendarAsync = createAsyncThunk<
  {
    userId: string;
    calId: string;
    color: Record<string, string>;
    name: string;
    desc: string;
    owner: string;
    ownerEmails: string[];
  },
  {
    userId: string;
    calId: string;
    color: Record<string, string>;
    name: string;
    desc: string;
  },
  { rejectValue: RejectedError }
>(
  "calendars/createCalendar",
  async ({ userId, calId, color, name, desc }, { rejectWithValue }) => {
    try {
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
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);

export const addSharedCalendarAsync = createAsyncThunk<
  {
    calId: string;
    color: Record<string, string>;
    link: string;
    name: string;
    desc: string;
    owner: string;
    ownerEmails: string[];
  },
  { userId: string; calId: string; cal: Record<string, any> },
  { rejectValue: RejectedError }
>(
  "calendars/addSharedCalendar",
  async ({ userId, calId, cal }, { rejectWithValue }) => {
    try {
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
        color: cal.color,
        link: `/calendars/${userId}/${calId}.json`,
        desc: cal.cal["caldav:description"],
        name:
          ownerData.id !== userId && cal.cal["dav:name"] === "#default"
            ? `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${
                ownerData.lastname
              }` + "'s calendar"
            : cal.cal["dav:name"],
        owner: `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${
          ownerData.lastname
        }`,
        ownerEmails: ownerData.emails,
      };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);

export const importEventFromFileAsync = createAsyncThunk<
  void,
  {
    calLink: string;
    file: File;
  },
  { rejectValue: RejectedError }
>("calendars/importEvent", async ({ calLink, file }, { rejectWithValue }) => {
  try {
    const id = ((await importFile(file)) as Record<string, string>)._id;
    const response = await importEventFromFile(id, calLink);
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});

const CalendarSlice = createSlice({
  name: "calendars",
  initialState: {
    list: {} as Record<string, Calendar>,
    templist: {} as Record<string, Calendar>,
    pending: false,
    error: null as string | null,
  } as {
    list: Record<string, Calendar>;
    templist: Record<string, Calendar>;
    pending: boolean;
    error: string | null;
  },
  reducers: {
    createCalendar: (
      state,
      action: PayloadAction<Record<string, string | Record<string, string>>>
    ) => {
      const id = Date.now().toString(36);
      state.list[id] = {} as Calendar;
      state.list[id].name = action.payload.name as string;
      state.list[id].color = action.payload.color as Record<string, string>;
      state.list[id].description = action.payload.description as string;
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
      ].URL = `/calendars/${action.payload.calendarUid}/${
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
    emptyEventsCal: (
      state,
      action: PayloadAction<{ calId?: string; calType?: "temp" }>
    ) => {
      const cals =
        action.payload.calType === "temp" ? state.templist : state.list;
      if (action.payload.calId) {
        cals[action.payload.calId].events = {};
      } else {
        Object.keys(state.templist).forEach(
          (calId) => (cals[calId].events = {})
        );
      }
    },
    updateEventLocal: (
      state,
      action: PayloadAction<{ calId: string; event: CalendarEvent }>
    ) => {
      const { calId, event } = action.payload;
      state.list[calId].events[event.uid] = event;
    },
    clearFetchCache: (state, action: PayloadAction<string>) => {
      if (!state.list[action.payload]) return;
      state.list[action.payload].lastCacheCleared = Date.now();
    },
    clearError: (state) => {
      state.error = null;
    },
    updateCalColor: (
      state,
      action: PayloadAction<{
        id: string;
        color: { light: string; dark: string };
      }>
    ) => {
      state.list[action.payload.id].color = action.payload.color;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fulfilled cases
      .addCase(
        getCalendarsListAsync.fulfilled,
        (
          state,
          action: PayloadAction<{
            importedCalendars: Record<string, Calendar>;
            errors: string;
          }>
        ) => {
          state.pending = false;
          state.list = action.payload.importedCalendars;
          state.error = action.payload.errors.length
            ? action.payload.errors
            : null;
        }
      )
      .addCase(
        getTempCalendarsListAsync.fulfilled,
        (state, action: PayloadAction<Record<string, Calendar>>) => {
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
            syncToken?: string;
          }>
        ) => {
          state.pending = false;
          const type = action.payload.calType === "temp" ? "templist" : "list";

          if (!state[type][action.payload.calId]) {
            return;
          }
          state[type][action.payload.calId].syncToken =
            action.payload.syncToken;
          action.payload.events.forEach((event) => {
            state[type][action.payload.calId].events[event.uid] = event;
          });
          Object.keys(state[type][action.payload.calId].events).forEach(
            (id) => {
              state[type][action.payload.calId].events[id].color =
                state[type][action.payload.calId].color;
              state[type][action.payload.calId].events[id].calId =
                action.payload.calId;
              if (!state[type][action.payload.calId].events[id].timezone) {
                state[type][action.payload.calId].events[id].timezone =
                  browserDefaultTimeZone;
              }
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
            } as Calendar;
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
              if (!state[type][action.payload.calId].events[id].timezone) {
                state[type][action.payload.calId].events[id].timezone =
                  browserDefaultTimeZone;
              }
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
            } as Calendar;
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
            } as Calendar;
          }
          action.payload.events.forEach((event) => {
            state.list[action.payload.calId].events[event.uid] = event;
          });
          Object.keys(state.list[action.payload.calId].events).forEach((id) => {
            state.list[action.payload.calId].events[id].color =
              state.list[action.payload.calId].color;
            state.list[action.payload.calId].events[id].calId =
              action.payload.calId;
            if (!state.list[action.payload.calId].events[id].timezone) {
              state.list[action.payload.calId].events[id].timezone =
                browserDefaultTimeZone;
            }
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
        state.error = null;
      })
      .addCase(deleteEventInstanceAsync.fulfilled, (state, action) => {
        state.pending = false;
        delete state.list[action.payload.calId].events[action.payload.eventId];
        state.error = null;
      })
      .addCase(updateEventInstanceAsync.fulfilled, (state, action) => {
        state.pending = false;
        state.list[action.payload.calId].events[action.payload.event.uid] =
          action.payload.event;
        state.error = null;
      })
      .addCase(updateSeriesAsync.fulfilled, (state) => {
        state.pending = false;
        state.error = null;
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
        } as Calendar;
        state.error = null;
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
        state.error = null;
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
        } as Calendar;
        state.error = null;
      })
      .addCase(removeCalendarAsync.fulfilled, (state, action) => {
        state.pending = false;
        delete state.list[action.payload.calId];
        state.error = null;
      })
      .addCase(patchACLCalendarAsync.fulfilled, (state, action) => {
        state.pending = false;
        state.list[action.payload.calId].visibility =
          action.payload.request !== "" ? "public" : "private";
        state.error = null;
      })
      .addCase(importEventFromFileAsync.fulfilled, (state) => {
        state.pending = false;
        state.error = null;
      })
      .addCase(refreshCalendarWithSyncToken.fulfilled, (state, action) => {
        state.pending = false;
        state.error = null;

        const { calId, deletedEvents, createdOrUpdatedEvents, calType } =
          action.payload;

        const target =
          calType === "temp" ? state.templist[calId] : state.list[calId];

        for (const id of deletedEvents) {
          delete target.events[id];
        }

        for (const event of createdOrUpdatedEvents) {
          target.events[event.uid] = event;
        }
      })
      // Pending cases
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
      .addCase(deleteEventInstanceAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(updateEventInstanceAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(updateSeriesAsync.pending, (state) => {
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
      })
      .addCase(importEventFromFileAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(refreshCalendarWithSyncToken.pending, (state) => {
        state.pending = true;
      })
      // Rejected cases
      .addCase(getCalendarsListAsync.rejected, (state, action) => {
        if (action.payload?.status !== 401) {
          state.pending = false;
          state.error =
            action.payload?.message ||
            action.error.message ||
            "Failed to load calendars";
        }
      })
      .addCase(getTempCalendarsListAsync.rejected, (state, action) => {
        state.pending = false;
        if (
          action.payload?.message.includes("aborted") ||
          action.error.name === "AbortError"
        ) {
          return;
        }
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to load temporary calendars";
      })
      .addCase(getCalendarDetailAsync.rejected, (state, action) => {
        state.pending = false;
        if (
          action.payload?.message.includes("aborted") ||
          action.error.name === "AbortError"
        ) {
          return;
        }
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to load calendar details";
      })
      .addCase(putEventAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to create event";
      })
      .addCase(getEventAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to load event";
      })
      .addCase(moveEventAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to move event";
      })
      .addCase(deleteEventAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to delete event";
      })
      .addCase(deleteEventInstanceAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to delete event instance";
      })
      .addCase(updateEventInstanceAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to update event instance";
      })
      .addCase(updateSeriesAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to update event series";
      })
      .addCase(patchCalendarAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to update calendar";
      })
      .addCase(createCalendarAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to create calendar";
      })
      .addCase(addSharedCalendarAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to add shared calendar";
      })
      .addCase(removeCalendarAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to remove calendar";
      })
      .addCase(patchACLCalendarAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to update calendar permissions";
      })
      .addCase(importEventFromFileAsync.rejected, (state, action) => {
        state.pending = false;
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to import event from file";
      })
      .addCase(refreshCalendarWithSyncToken.rejected, (state, action) => {
        state.pending = false;
        state.error = state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to refreshCalendar";
      });
  },
});

export const {
  addEvent,
  removeEvent,
  createCalendar,
  updateEventLocal,
  removeTempCal,
  emptyEventsCal,
  clearFetchCache,
  clearError,
  updateCalColor,
} = CalendarSlice.actions;
export default CalendarSlice.reducer;
