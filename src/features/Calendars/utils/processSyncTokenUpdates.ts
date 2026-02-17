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
    if (update.status === 404) {
      toDelete.push(href);
    } else if (update.status === 200) {
      toExpand.push(href);
      toDelete.push(href); // we delete the old version of the event to replace it by the new when it's updated
    } else if (update.status === 410) {
      throw new Error("SYNC_TOKEN_INVALID");
    }
  }

  return { toDelete, toExpand };
}
