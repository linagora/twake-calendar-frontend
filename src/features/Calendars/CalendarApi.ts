import { calendarAction, fetchCalendar, fetchCalendars } from './CalendarDAO'
import { CalendarInput, CalendarList } from './types/CalendarData'

export async function getCalendars(
  userId: string,
  scope?: string,
  signal?: AbortSignal
): Promise<CalendarList> {
  return fetchCalendars(userId, scope, signal)
}

export async function getCalendar(
  id: string,
  match: { start: string; end: string },
  signal?: AbortSignal
): Promise<unknown> {
  return fetchCalendar(id, match, signal)
}

export async function postCalendar(
  userId: string,
  calId: string,
  color: Record<string, string>,
  name: string,
  desc: string
): Promise<Response> {
  const body = JSON.stringify({
    id: calId,
    'dav:name': name,
    'apple:color': color.light,
    'caldav:description': desc
  })

  return calendarAction('POST', `/calendars/${userId}.json`, body)
}

export async function addSharedCalendar(
  userId: string,
  calId: string,
  cal: CalendarInput
): Promise<Response> {
  const body = JSON.stringify({
    id: calId,
    ...cal.cal,
    'calendarserver:source': {
      acl: cal.cal.acl,
      calendarHomeId: cal.cal.id,
      color: cal.cal['apple:color'],
      description: cal.cal['caldav:description'],
      href: cal.cal?._links?.self?.href,
      id: cal.cal.id,
      invite: cal.cal.invite,
      name: cal.cal['dav:name']
    }
  })

  return calendarAction('POST', `/calendars/${userId}.json`, body)
}

export async function proppatchCalendar(
  calLink: string,
  patch: { name: string; desc: string; color: Record<string, string> }
): Promise<Response> {
  const body = JSON.stringify({
    'dav:name': patch.name,
    'caldav:description': patch.desc,
    'apple:color': patch.color.light
  })

  return calendarAction('PROPPATCH', calLink, body)
}
