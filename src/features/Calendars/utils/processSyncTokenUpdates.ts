import { DavSyncItem } from "../api/types";

export interface ProcessedSyncUpdates {
  toDelete: string[];
  toExpand: string[];
}

export function processSyncUpdates(
  updates: DavSyncItem[]
): ProcessedSyncUpdates {
  const toDelete: string[] = [];
  const toExpand: string[] = [];

  for (const update of updates) {
    const href = update?._links?.self?.href;
    if (!href) continue;
    const fileName = extractFileNameFromHref(href);

    if (update.status === 404) {
      toDelete.push(href);
    } else if (update.status === 200) {
      toExpand.push(href);
      toDelete.push(fileName); // we delete the old version of the event to replace it by the new when it's updated
    } else if (update.status === 410) {
      throw new Error("SYNC_TOKEN_INVALID");
    }
  }

  return { toDelete, toExpand };
}

function extractFileNameFromHref(href: string): string {
  const fileNameMatch = href.match(/\/([^/]+)\.ics$/); // CalDAV href are like /calendars/userID/CalendarID/EventId.ics
  return fileNameMatch ? fileNameMatch[1] : href;
}
