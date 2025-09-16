import { api } from "../../utils/apiUtils";

export async function getCalendars(userId: string) {
  const calendars = await api
    .get(
      `dav/calendars/${userId}.json?personal=true&sharedDelegationStatus=accepted&sharedPublicSubscription=true&withRights=true`,
      {
        headers: {
          Accept: "application/calendar+json",
        },
      }
    )
    .json();
  return calendars;
}

export async function getCalendar(
  id: string,
  match: { start: string; end: string }
) {
  const response = await api(`dav/calendars/${id}.json`, {
    method: "REPORT",
    headers: {
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify({
      match,
    }),
  });
  const calendar = await response.json();
  return calendar;
}

export async function postCalendar(
  userId: string,
  calId: string,
  color: string,
  name: string,
  desc: string
) {
  const response = await api.post(`dav/calendars/${userId}.json`, {
    headers: {
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify({
      id: calId,
      "dav:name": name,
      "apple:color": color,
      "caldav:description": desc,
    }),
  });
  return response;
}

export async function addSharedCalendar(
  userId: string,
  calId: string,
  cal: Record<string, any>
) {
  const response = await api.post(`dav/calendars/${userId}.json`, {
    headers: {
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify({
      id: calId,
      ...cal.cal._embedded["dav:calendar"][0],
    }),
  });
  return response;
}

export async function proppatchCalendar(
  calLink: string,
  patch: { name: string; desc: string; color: string }
) {
  const body: Record<string, string> = {};
  if (patch.name) {
    body["dav:name"] = patch.name;
  }
  if (patch.desc) {
    body["caldav:description"] = patch.desc;
  }
  if (patch.color) {
    body["apple:color"] = patch.color;
  }
  const response = await api(`dav${calLink}`, {
    method: "PROPPATCH",
    headers: {
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify(body),
  });
  return response;
}
