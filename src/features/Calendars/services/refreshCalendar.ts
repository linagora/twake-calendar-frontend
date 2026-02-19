import { CalendarEvent } from "@/features/Events/EventsTypes";
import { buildDelegatedEventURL } from "@/features/Events/eventUtils";
import { toRejectedError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import pMap from "p-map";
import { fetchSyncTokenChanges } from "../api/fetchSyncTokenChanges";
import { Calendar } from "../CalendarTypes";
import { RejectedError } from "../types/RejectedError";
import { expandEventFunction } from "../utils/expandEventFunction";
import { processSyncUpdates } from "../utils/processSyncTokenUpdates";

export interface SyncTokenUpdates {
  calId: string;
  deletedEvents: string[];
  createdOrUpdatedEvents: CalendarEvent[];
  calType?: "temp";
  syncToken?: string;
  syncStatus?: string;
}

export const refreshCalendarWithSyncToken = createAsyncThunk<
  SyncTokenUpdates,
  {
    calendar: Calendar;
    calType?: "temp";
    calendarRange: {
      start: Date;
      end: Date;
    };
    maxConcurrency?: number;
  },
  {
    rejectValue: RejectedError;
  }
>(
  "calendars/refreshWithSyncToken",
  async (
    { calendar, maxConcurrency = 8, calendarRange, calType },
    { rejectWithValue }
  ) => {
    try {
      if (!calendar?.syncToken) {
        return {
          calId: calendar.id,
          deletedEvents: [],
          createdOrUpdatedEvents: [],
          calType,
          syncStatus: "NO_SYNC_TOKEN",
        };
      }

      const response = await fetchSyncTokenChanges(calendar);
      const newSyncToken = response["sync-token"];
      const updates = response?._embedded?.["dav:item"] ?? [];

      const { toDelete, toExpand } = processSyncUpdates(updates);

      const createdOrUpdatedEvents = await pMap(
        toExpand,
        expandEventFunction(calendarRange, calendar),
        { concurrency: maxConcurrency }
      );

      return {
        calId: calendar.id,
        deletedEvents: toDelete.map((eventURL) =>
          calendar.delegated
            ? buildDelegatedEventURL(calendar, { URL: eventURL })
            : eventURL
        ),
        createdOrUpdatedEvents: createdOrUpdatedEvents
          .flat()
          .filter(Boolean) as CalendarEvent[],
        calType,
        syncToken: newSyncToken,
        syncStatus: newSyncToken ? "SUCCESS" : "NO_NEW_SYNC_TOKEN",
      };
    } catch (err) {
      return rejectWithValue(toRejectedError(err));
    }
  }
);
