import { cp } from "node:fs";

export async function getCalendars(userId: string, opaque_token: string) {
  const response = await fetch(
    `${(window as any).CALENDAR_BASE_URL}/dav/calendars/${userId}.json?personal=true&sharedDelegationStatus=accepted&sharedPublicSubscription=true&withRights=true`,
    {
      headers: {
        Accept: "application/calendar+json",
        Authorization: `Bearer ${opaque_token}`,
      },
    }
  );
  const calendars = await response.json();
  return calendars;
}

export async function getCalendar(id: string, opaque_token: string) {
  const response = await fetch(
    `${(window as any).CALENDAR_BASE_URL}/dav/calendars/${id}.json`,
    {
      method: "REPORT",
      headers: {
        Accept: "application/json, text/plain, */*",
        Authorization: `Bearer ${opaque_token}`,
      },
      body: JSON.stringify({
        match: { start: "20250525T000000", end: "20250708T000000" },
      }),
    }
  );
  const calendar = await response.json();
  return calendar;
}
