import { createAsyncThunk } from "@reduxjs/toolkit";
import { formatReduxError } from "../../../utils/errorUtils";
import { getEvent } from "../../Events/EventApi";
import { CalendarEvent } from "../../Events/EventsTypes";
import { fetchSyncTokenChanges } from "../api/fetchSyncTokenChanges";
import { RejectedError } from "../CalendarSlice";
import { Calendars } from "../CalendarTypes";

export interface SyncTokenUpdates {
  calId: string;
  deletedEvents: string[];
  createdOrUpdatedEvents: CalendarEvent[];
  calType?: "temp";
}

export const refreshCalendarWithSyncToken = createAsyncThunk<
  SyncTokenUpdates,
  {
    calendar: Calendars;
    calType?: "temp";
    batchSize?: number;
  },
  {
    rejectValue: RejectedError;
  }
>(
  "calendars/refreshWithSyncToken",
  async ({ calendar, batchSize = 8, calType }, { rejectWithValue }) => {
    try {
      if (!calendar?.syncToken) {
        return {
          calId: calendar.id,
          deletedEvents: [],
          createdOrUpdatedEvents: [],
        };
      }

      const response = await fetchSyncTokenChanges(calendar);
      const updates = response?._embedded?.["dav:item"] ?? [];

      const deletedEvents: string[] = [];
      const toExpand: string[] = [];

      for (const update of updates) {
        const href = update?._links?.self?.href;
        if (!href) continue;

        if (update.status === 404) {
          const fileNameMatch = href.match(/\/([^\/]+)\.ics$/);
          const fileName = fileNameMatch ? fileNameMatch[1] : href;
          deletedEvents.push(fileName);
        } else if (update.status === 200) {
          toExpand.push(href);
        }
        if (update.status === 410) {
          throw new Error("SYNC_TOKEN_INVALID");
        }
      }

      const createdOrUpdatedEvents: CalendarEvent[] = [];

      for (let i = 0; i < toExpand.length; i += batchSize) {
        const batch = toExpand.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (eventUrl) => {
            try {
              return {
                ...(await getEvent({ URL: eventUrl } as CalendarEvent)),
                calId: calendar.id,
              };
            } catch (err) {
              console.error("Failed to fetch event", eventUrl);
              return undefined;
            }
          })
        );

        createdOrUpdatedEvents.push(
          ...(batchResults.filter(Boolean) as CalendarEvent[])
        );
      }

      return {
        calId: calendar.id,
        deletedEvents,
        createdOrUpdatedEvents,
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
