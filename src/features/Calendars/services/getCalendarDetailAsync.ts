import { createAsyncThunk } from "@reduxjs/toolkit";
import { formatReduxError } from "../../../utils/errorUtils";
import { CalendarEvent } from "../../Events/EventsTypes";
import { parseCalendarEvent } from "../../Events/eventUtils";
import { CalDavItem } from "../api/types";
import { getCalendar } from "../CalendarApi";
import { RejectedError } from "../CalendarSlice";

export const getCalendarDetailAsync = createAsyncThunk<
  {
    calId: string;
    events: CalendarEvent[];
    calType?: string;
    syncToken?: string;
  },
  {
    calId: string;
    match: { start: string; end: string };
    calType?: string;
    signal?: AbortSignal;
  },
  { rejectValue: RejectedError }
>(
  "calendars/getCalendarDetails",
  async ({ calId, match, calType, signal }, { rejectWithValue }) => {
    try {
      const calendar = (await getCalendar(calId, match, signal)) as any;

      const color = calendar["apple:color"];
      const syncToken = calendar._embedded?.["sync-token"];

      const items = calendar._embedded?.["dav:item"];
      const events: CalendarEvent[] = Array.isArray(items)
        ? items.flatMap((item: any) =>
            extractCalendarEvents(item, { calId, color })
          )
        : [];

      return { calId, events, calType, syncToken };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);

function extractCalendarEvents(
  item: CalDavItem,
  options: {
    calId: string;
    color?: string;
  }
): CalendarEvent[] {
  const data = item.data;
  if (!Array.isArray(data)) {
    return [];
  }

  // According to CalDAV, VEVENTS is at index 2
  const vevents = data[2];
  if (!Array.isArray(vevents)) {
    return [];
  }

  const eventURL = item._links?.self?.href;
  if (!eventURL) {
    return [];
  }

  // VALARM is optional and deeply nested
  const valarm =
    Array.isArray(vevents[0]) && Array.isArray(vevents[0][2])
      ? vevents[0][2][0]
      : undefined;

  return vevents
    .map((vevent) => {
      if (!Array.isArray(vevent)) {
        return null;
      }

      const eventProps = vevent[1];
      if (!eventProps) {
        return null;
      }

      return parseCalendarEvent(
        eventProps,
        { light: options.color ?? "", dark: "" },
        options.calId,
        eventURL,
        valarm
      );
    })
    .filter(Boolean) as CalendarEvent[];
}
