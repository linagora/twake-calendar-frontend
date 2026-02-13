import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";
import { browserDefaultTimeZone } from "@/utils/timezone";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CalendarEvent } from "../Events/EventsTypes";
import { Calendar } from "./CalendarTypes";
import {
  addSharedCalendarAsync,
  createCalendarAsync,
  deleteEventAsync,
  deleteEventInstanceAsync,
  getCalendarDetailAsync,
  getCalendarsListAsync,
  getEventAsync,
  getTempCalendarsListAsync,
  importEventFromFileAsync,
  moveEventAsync,
  patchACLCalendarAsync,
  patchCalendarAsync,
  putEventAsync,
  refreshCalendarWithSyncToken,
  removeCalendarAsync,
  updateEventInstanceAsync,
  updateSeriesAsync,
} from "./services";

const CalendarSlice = createSlice({
  name: "calendars",
  initialState: {
    list: {} as Record<string, Calendar>,
    templist: {} as Record<string, Calendar>,
    pending: true,
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
      ].URL = `/calendars/${action.payload.calendarUid}/${extractEventBaseUuid(
        action.payload.event.uid
      )}.ics`;
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
      .addCase(putEventAsync.fulfilled, (state) => {
        state.pending = false;
        state.error = null;
      })
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
          if (
            Object.keys(state.list[action.payload.calId].events).find(
              (eventId: string) => {
                const eventIdBase = extractEventBaseUuid(eventId);
                return eventIdBase === action.payload.event.uid;
              }
            )
          ) {
            Object.keys(state.list[action.payload.calId].events)
              .filter((eventKey) => {
                const baseUid = extractEventBaseUuid(eventKey);
                return baseUid === action.payload.event.uid;
              })
              .forEach((eventKey) => {
                state.list[action.payload.calId].events[eventKey] = {
                  ...state.list[action.payload.calId].events[eventKey],
                  repetition: action.payload.event.repetition,
                  timezone: action.payload.event.timezone,
                };
              });
          } else {
            state.list[action.payload.calId].events[action.payload.event.uid] =
              action.payload.event;
          }
        }
      )
      .addCase(moveEventAsync.fulfilled, (state) => {
        state.pending = false;
        state.error = null;
      })
      .addCase(deleteEventAsync.fulfilled, (state) => {
        state.pending = false;
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
      .addCase(patchCalendarAsync.fulfilled, (state) => {
        state.pending = false;
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
      .addCase(removeCalendarAsync.fulfilled, (state) => {
        state.pending = false;
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

        const {
          calId,
          deletedEvents,
          createdOrUpdatedEvents,
          calType,
          syncToken,
          syncStatus,
        } = action.payload;

        const target =
          calType === "temp" ? state.templist[calId] : state.list[calId];

        if (!target) {
          return;
        }

        if (syncStatus === "SUCCESS") {
          const deletedSet = new Set(deletedEvents); // working with a Set for deletion avoids O(nxm) complexity
          Object.keys(target.events)
            .filter((eventKey) => {
              const baseUid = extractEventBaseUuid(eventKey);
              return deletedSet.has(eventKey) || deletedSet.has(baseUid);
            })
            .forEach((eventKey) => delete target.events[eventKey]);

          for (const event of createdOrUpdatedEvents) {
            target.events[event.uid] = event;
          }
          target.syncToken = syncToken;
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
        state.pending = false;
        if (action.payload?.status !== 401) {
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
        state.error =
          action.payload?.message ||
          action.error.message ||
          "Failed to refresh calendar";
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
