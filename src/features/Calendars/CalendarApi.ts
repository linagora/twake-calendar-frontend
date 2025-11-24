import { api } from "../../utils/apiUtils";

export async function getCalendars(
  userId: string,
  scope: string = "personal=true&sharedDelegationStatus=accepted&sharedPublicSubscription=true&",
  signal?: AbortSignal
) {
  const calendars = await api
    .get(`dav/calendars/${userId}.json?${scope}`, {
      headers: {
        Accept: "application/calendar+json",
      },
      signal,
    })
    .json();
  return calendars;
}

export async function getCalendar(
  id: string,
  match: { start: string; end: string },
  signal?: AbortSignal
) {
  const response = await api(`dav/calendars/${id}.json`, {
    method: "REPORT",
    headers: {
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify({
      match,
    }),
    signal,
  });
  const calendar = await response.json();
  return calendar;
}

export async function postCalendar(
  userId: string,
  calId: string,
  color: Record<string, string>,
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
      "apple:color": color.light,
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
      ...cal.cal,
      "dav:name":
        cal.cal["dav:name"] === "#default"
          ? cal.owner.displayName + "'s calendar"
          : cal.cal["dav:name"],
      "calendarserver:source": {
        acl: cal.cal.acl,
        calendarHomeId: cal.cal.id,
        color: cal.cal["apple:color"],

        description: cal.cal["caldav:description"],
        href: cal.cal._links.self.href,
        id: cal.cal.id,
        invite: cal.cal.invite,
        name: cal.cal["dav:name"],
      },
    }),
  });
  return response;
}

export async function proppatchCalendar(
  calLink: string,
  patch: { name: string; desc: string; color: Record<string, string> }
) {
  const body: Record<string, string> = {};
  if (patch.name) {
    body["dav:name"] = patch.name;
  }
  if (patch.desc) {
    body["caldav:description"] = patch.desc;
  }
  if (patch.color.light) {
    body["apple:color"] = patch.color.light;
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

export async function removeCalendar(calLink: string) {
  const response = await api(`dav${calLink}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json, text/plain, */*",
    },
  });
  return response;
}

export async function updateAclCalendar(calLink: string, request: string) {
  const response = await api(`dav${calLink}`, {
    method: "ACL",
    headers: {
      Accept: "application/json",
    },
    body: JSON.stringify({ public_right: request }),
  });
  return response;
}

export async function getSecretLink(calLink: string, reset: boolean) {
  const response = await api
    .get(`calendar/api${calLink}/secret-link?shouldResetLink=${reset}`, {
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    })
    .json();
  return response as { secretLink: string };
}

export async function exportCalendar(calLink: string) {
  const response = await api
    .get(`dav${calLink}?export`, {
      headers: {
        Accept: "application/calendar",
      },
    })
    .text();
  return response;
}
