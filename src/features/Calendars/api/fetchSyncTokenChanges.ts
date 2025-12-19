import { noPrefixApi } from "../../../utils/apiUtils";

export async function fetchSyncTokenChanges(syncToken: string) {
  const response = await noPrefixApi(syncToken, {
    method: "REPORT",
  }).json();
  return response;
}
