import { createAsyncThunk } from "@reduxjs/toolkit";
import { formatDateToYYYYMMDDTHHMMSS } from "../../../utils/dateUtils";
import { formatReduxError } from "../../../utils/errorUtils";
import { reportEvent } from "../../Events/EventApi";
import { CalendarEvent } from "../../Events/EventsTypes";
import { fetchSyncTokenChanges } from "../api/fetchSyncTokenChanges";
import { RejectedError } from "../CalendarSlice";
import { Calendars } from "../CalendarTypes";
import { extractCalendarEvents } from "../utils/extractCalendarEvents";

export interface SyncTokenUpdates {
  calId: string;
  deletedEvents: string[];
  createdOrUpdatedEvents: CalendarEvent[];
  calType?: "temp";
  syncToken?: string;
}

async function processConcurrently<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  maxConcurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const promise = processor(item)
      .then((result) => {
        results.push(result);
      })
      .finally(() => executing.delete(promise));
    executing.add(promise);

    if (executing.size >= maxConcurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

export const refreshCalendarWithSyncToken = createAsyncThunk<
  SyncTokenUpdates,
  {
    calendar: Calendars;
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

      const createdOrUpdatedEvents = await processConcurrently(
        toExpand,
        async (eventUrl) => {
          try {
            const item = await reportEvent({ URL: eventUrl } as CalendarEvent, {
              start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
              end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
            });
            const events: CalendarEvent[] = extractCalendarEvents(item, {
              calId: calendar.id,
              color: calendar.color,
            });
            return events;
          } catch (err) {
            console.error("Failed to fetch event", eventUrl);
            return undefined;
          }
        },
        maxConcurrency
      );

      return {
        calId: calendar.id,
        deletedEvents,
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
