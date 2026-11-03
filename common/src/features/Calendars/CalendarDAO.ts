import { Calendar } from '@common/types/CalendarTypes'
import { api } from '@common/utils/apiUtils'
import { isSafeColor } from '@common/utils/safeColor'
import { DavSyncResponse } from './types/CalendarApiTypes'
import { CalendarList } from './types/CalendarData'
import { calendarDavPath } from './utils/calendarDavPath'

export async function fetchCalendars(
  userId: string,
  scope: string = 'personal=true&sharedDelegationStatus=accepted&sharedPublicSubscription=true&withRights=true',
  signal?: AbortSignal
): Promise<CalendarList> {
  const calendars = await api
    .get(`dav/calendars/${userId}?${scope}`, {
      headers: { Accept: 'application/calendar+json' },
      signal
    })
    .json<CalendarList>()
  return withSafeColors(calendars)
}

/**
 * Drops the colors that are not plain hexadecimal colors: they are chosen by
 * the owner of each calendar and end up in style rules.
 */
function withSafeColors(calendars: CalendarList): CalendarList {
  const list = calendars?._embedded?.['dav:calendar']
  if (!Array.isArray(list)) return calendars
  list.forEach(cal => {
    if (cal && 'apple:color' in cal && !isSafeColor(cal['apple:color'])) {
      delete cal['apple:color']
    }
  })
  return calendars
}

export async function fetchCalendar(
  calendar: Pick<Calendar, 'id' | 'link' | 'delegated'>,
  match: { start: string; end: string },
  signal?: AbortSignal
): Promise<unknown> {
  const response = await api(`dav${calendarDavPath(calendar)}`, {
    method: 'REPORT',
    headers: { Accept: 'application/json, text/plain, */*' },
    body: JSON.stringify({ match }),
    signal
  })
  return response.json()
}

export async function fetchEventByUid(
  userId: string,
  uid: string,
  signal?: AbortSignal
): Promise<unknown> {
  const response = await api(`dav/calendars/${userId}`, {
    method: 'REPORT',
    headers: { Accept: 'application/json, text/plain, */*' },
    body: JSON.stringify({ uid }),
    signal
  })
  return response.json()
}

// Extract the calendar id ("{userId}/{calendarId}") from an event href such as
// "/calendars/{userId}/{calendarId}/{eventUid}.ics".
export function calendarIdFromEventHref(href: string): string {
  const parts = href.split('/').filter(Boolean)
  const idx = parts.indexOf('calendars')
  return `${parts[idx + 1]}/${parts[idx + 2]}`
}

export type CalendarPostBody = string

export async function calendarAction(
  method: 'POST' | 'PROPPATCH' | 'DELETE',
  path: string,
  body?: CalendarPostBody
): Promise<Response> {
  return api(`dav${path}`, {
    method,
    headers: { Accept: 'application/json, text/plain, */*' },
    body
  })
}

export async function updateCalendarAcl(
  calLink: string,
  request: string
): Promise<Response> {
  return api(`dav${calLink}`, {
    method: 'ACL',
    headers: { Accept: 'application/json' },
    body: JSON.stringify({ public_right: request })
  })
}

export async function fetchSecretLink(
  calLink: string,
  reset: boolean
): Promise<{ secretLink: string }> {
  const response = await api
    .get(`calendar/api${calLink}/secret-link?shouldResetLink=${reset}`, {
      headers: { Accept: 'application/json, text/plain, */*' }
    })
    .json()
  return response as { secretLink: string }
}

export async function fetchCalendarExport(calLink: string): Promise<string> {
  return api
    .get(`dav${calLink}?export`, {
      headers: { Accept: 'application/calendar' }
    })
    .text()
}

export async function fetchSyncTokenChanges(
  calendar: Calendar
): Promise<DavSyncResponse> {
  const response = await api(`dav${calendarDavPath(calendar)}`, {
    method: 'REPORT',
    headers: {
      Accept: 'application/json, text/plain, */*'
    },
    body: JSON.stringify({
      'sync-token': calendar.syncToken
    })
  })
  const update: DavSyncResponse = await response.json()
  return update
}

export async function updateDelegationCalendar(
  calLink: string,
  share: {
    set: { [x: string]: string | boolean; 'dav:href': string }[]
    remove: { [x: string]: string | boolean; 'dav:href': string }[]
  }
): Promise<Response> {
  const response = await api.post(`dav${calLink}`, {
    headers: {
      Accept: 'application/json, text/plain, */*'
    },
    body: JSON.stringify({ share })
  })
  return response
}
