import { api } from "@/utils/apiUtils";

export async function updateDelegationCalendar(
  calLink: string,
  share: {
    set: { [x: string]: string | boolean; "dav:href": string }[];
    remove: { [x: string]: string | boolean; "dav:href": string }[];
  }
) {
  const response = await api.post(`dav${calLink}`, {
    headers: {
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify({ share }),
  });
  return response;
}
