import { api } from "@/utils/apiUtils";

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

  const { users } = (await r.json()) as { users: UserFreeBusy[] };

  const eventUidBase = eventUid.split("/")[0];

  return Object.fromEntries(
    users.map((u) => {
      const isBusy = u.calendars.some((cal) =>
        cal.busy.some((slot) => slot.uid !== eventUidBase)
      );
      return [u.id, isBusy];
    })
  );
}
