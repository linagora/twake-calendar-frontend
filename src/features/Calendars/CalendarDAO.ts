import { api } from '@/utils/apiUtils'
import { CalendarList } from './types/CalendarData'

export async function fetchCalendars(
  userId: string,
  scope: string = 'personal=true&sharedDelegationStatus=accepted&sharedPublicSubscription=true&withRights=true',
  signal?: AbortSignal
): Promise<CalendarList> {
  const calendars = await api
    .get(`dav/calendars/${userId}.json?${scope}`, {
      headers: { Accept: 'application/calendar+json' },
      signal
    })
    .json()
  return calendars as CalendarList
}

export async function fetchCalendar(
  id: string,
  match: { start: string; end: string },
  signal?: AbortSignal
): Promise<unknown> {
  const response = await api(`dav/calendars/${id}.json`, {
    method: 'REPORT',
    headers: { Accept: 'application/json, text/plain, */*' },
    body: JSON.stringify({ match }),
    signal
  })
  return response.json()
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
