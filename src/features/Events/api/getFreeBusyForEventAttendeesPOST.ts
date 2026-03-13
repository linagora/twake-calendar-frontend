import { api } from "@/utils/apiUtils";
import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";

interface BusySlot {
  uid: string;
  start: string;
  end: string;
}

interface CalendarFreeBusy {
  id: string;
  busy: BusySlot[];
}

interface UserFreeBusy {
  id: string;
  calendars: CalendarFreeBusy[];
}

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

  const payload: unknown = await r.json();
  const users = Array.isArray((payload as { users?: unknown })?.users)
    ? ((payload as { users: UserFreeBusy[] }).users ?? [])
    : [];

  const eventUidBase = extractEventBaseUuid(eventUid);

  return Object.fromEntries(
    users.map((u) => {
      const isBusy = u.calendars.some((cal) =>
        cal.busy.some((slot) => extractEventBaseUuid(slot.uid) !== eventUidBase)
      );
      return [u.id, isBusy];
    })
  );
}
