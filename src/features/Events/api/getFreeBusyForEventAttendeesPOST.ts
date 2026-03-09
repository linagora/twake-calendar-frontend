import { api } from "@/utils/apiUtils";

export async function getFreeBusyForEventAttendeesPOST(
  userIds: string[],
  start: string,
  end: string,
  eventUid: string
): Promise<Record<string, boolean>> {
  const r = await api("dav/calendars/freebusy", {
    method: "POST",
    headers: { Accept: "application/json, text/plain, */*" },
    body: JSON.stringify({ start, end, users: userIds, uids: [eventUid] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);

  const { users } = (await r.json()) as {
    users: { id: string; calendars: { busy: unknown[] }[] }[];
  };
  return Object.fromEntries(
    users.map((u) => [u.id, u.calendars.some((cal) => cal.busy.length > 0)])
  );
}
