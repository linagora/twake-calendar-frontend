import { createAsyncThunk } from "@reduxjs/toolkit";
import pMap from "p-map";
import { formatReduxError } from "../../../utils/errorUtils";
import { CalendarEvent } from "../../Events/EventsTypes";
import { fetchSyncTokenChanges } from "../api/fetchSyncTokenChanges";
import { RejectedError } from "../CalendarSlice";
import { Calendar } from "../CalendarTypes";
import { expandEventFunction } from "../utils/expandEventFunction";
import { processSyncUpdates } from "../utils/processSyncTokenUpdates";

export interface SyncTokenUpdates {
  calId: string;
  deletedEvents: string[];
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
          deletedEvents: [],
          createdOrUpdatedEvents: [],
          calType,
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
