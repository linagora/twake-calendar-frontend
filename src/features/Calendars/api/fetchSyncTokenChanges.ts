import { api } from "../../../utils/apiUtils";
import { Calendar } from "../CalendarTypes";
import { DavSyncResponse } from "./types";

export async function fetchSyncTokenChanges(
  calendar: Calendar
): Promise<DavSyncResponse> {
  const response = await api(`dav/calendars/${calendar.id}.json`, {
    method: "REPORT",
    headers: {
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify({
      "sync-token": calendar.syncToken,
    }),
  });
  const update: DavSyncResponse = await response.json();
  return update;
}
