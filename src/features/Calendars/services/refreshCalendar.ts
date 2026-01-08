import { createAsyncThunk } from "@reduxjs/toolkit";
import { formatReduxError } from "../../../utils/errorUtils";
import { processConcurrently } from "../../../utils/processConcurrently";
import { CalendarEvent } from "../../Events/EventsTypes";
import { fetchSyncTokenChanges } from "../api/fetchSyncTokenChanges";
import { RejectedError } from "../CalendarSlice";
import { Calendar } from "../CalendarTypes";
import { expandEventFunction } from "../utils/expandEventFunction";
import { processSyncUpdates } from "../utils/processSyncTokenUpdates";

export interface SyncTokenUpdates {
  calId: string;
  deletedEvents: Set<string>; // working with a Set for deletion avoids O(nxm) complexity
  createdOrUpdatedEvents: CalendarEvent[];
  calType?: "temp";
  syncToken?: string;
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
          deletedEvents: new Set<string>(),
          createdOrUpdatedEvents: [],
          calType,
        };
      }

      const response = await fetchSyncTokenChanges(calendar);
      const newSyncToken = response["sync-token"];
      const updates = response?._embedded?.["dav:item"] ?? [];

      const { toDelete, toExpand } = processSyncUpdates(updates);

      const createdOrUpdatedEvents = await processConcurrently(
        toExpand,
        expandEventFunction(calendarRange, calendar),
        maxConcurrency
      );

      return {
        calId: calendar.id,
        deletedEvents: toDelete,
        createdOrUpdatedEvents: createdOrUpdatedEvents
          .flat()
          .filter(Boolean) as CalendarEvent[],
        calType,
        syncToken: newSyncToken,
      };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);
