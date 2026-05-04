import { api } from '@/utils/apiUtils'
import ICAL from 'ical.js'
import { CalDavItem } from '../Calendars/api/types'
import { VCalComponent, VObjectProperty } from '../Calendars/types/CalendarData'
import { SearchEventsResponse } from '../Search/types/SearchEventsResponse'
import { CalendarEvent } from './EventsTypes'

export async function reportEventRaw(
  event: CalendarEvent,
  match: { start: string; end: string }
): Promise<CalDavItem> {
  const response = await api(`dav${event.URL}`, {
    method: 'REPORT',
    body: JSON.stringify({ match }),
    headers: { Accept: 'application/json' }
  })
  if (!response.ok) {
    throw new Error(`REPORT request failed with status ${response.status}`)
  }
  return response.json()
}

export async function fetchEventRaw(event: CalendarEvent): Promise<string> {
  const response = await api.get(`dav${event.URL}`)
  return response.text()
}

export async function fetchEventIcs(event: CalendarEvent): Promise<string> {
  const response = await api.get(`dav${event.URL}?export=`)
  return response.text()
}

export async function putEventRaw(
  event: CalendarEvent,
  jCal: unknown[]
): Promise<Response> {
  return api(`dav${event.URL}`, {
    method: 'PUT',
    body: JSON.stringify(jCal),
    headers: { 'content-type': 'text/calendar; charset=utf-8' }
  })
}

export async function deleteEventRaw(event: CalendarEvent): Promise<Response> {
  return api(`dav${event.URL}`, { method: 'DELETE' })
}

export async function moveEventRaw(
  event: CalendarEvent,
  toURL: string
): Promise<Response> {
  return api(`dav${event.URL}`, {
    method: 'MOVE',
    headers: { destination: toURL }
  })
}

export async function importEventRaw(
  id: string,
  calLink: string
): Promise<Response> {
  return api.post('api/import', {
    body: JSON.stringify({ fileId: id, target: calLink })
  })
}

export async function searchEventRaw(reqParam: {
  query: string
  calendars: { calendarId: string; userId: string }[]
  organizers?: string[]
  attendees?: string[]
}): Promise<SearchEventsResponse> {
  return api
    .post('calendar/api/events/search?limit=30&offset=0', {
      body: JSON.stringify(reqParam)
    })
    .json()
}

// ical.js encodes WKST as a number (1=SU … 7=SA) when parsing ICS to jCal.
// jCal consumers (including our CalDAV backend) expect the weekday string (SU, MO, …).
const WKST_NUM_TO_DAY: Record<number, string> = {
  1: 'SU',
  2: 'MO',
  3: 'TU',
  4: 'WE',
  5: 'TH',
  6: 'FR',
  7: 'SA'
}

function normalizeVeventRrule(vevents: VCalComponent[]): VCalComponent[] {
  return vevents.map(vevent => {
    const props = (vevent[1] as VObjectProperty[]).map(prop => {
      if (prop[0] === 'rrule' && prop[2] === 'recur') {
        const rule = prop[3] as Record<string, unknown>
        if (typeof rule.wkst === 'number') {
          const dayStr = WKST_NUM_TO_DAY[rule.wkst]
          if (dayStr) {
            return [prop[0], prop[1], prop[2], { ...rule, wkst: dayStr }] as VObjectProperty
          }
        }
      }
      return prop
    })
    return [vevent[0], props, vevent[2]] as VCalComponent
  })
}

/**
 * Fetches all VEVENTs (master + overrides) for a recurring series.
 * Returns the raw jCal VEVENT components with RRULE.wkst normalized to a weekday string.
 */
export async function fetchAllRecurrentVevents(
  event: CalendarEvent
): Promise<VCalComponent[]> {
  const response = await api.get(`dav${event.URL}`)
  const eventData = await response.text()
  const jcal = ICAL.parse(eventData) as VCalComponent
  const vevents = (jcal[2] ?? []).filter(([name]) => name === 'vevent')
  return normalizeVeventRrule(vevents)
}

/**
 * POSTs an iTIP COUNTER proposal for a calendar event.
 * Accepts a pre-serialized ICS string and the envelope metadata.
 */
export interface CounterProposalPayload {
  ical: string
  sender: string
  recipient: string
  uid: string
  sequence: number
  method: 'COUNTER'
}
export async function postCounterProposalRaw(
  event: CalendarEvent,
  payload: CounterProposalPayload
): Promise<Response> {
  const response = await api(`dav${event.URL}`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      accept: 'application/json,text/plain,*/*',
      'content-type': 'application/calendar+json',
      Prefer: 'return=representation',
      'X-Http-Method-Override': 'ITIP'
    }
  })
  if (!response.ok) {
    throw new Error(`postCounterProposal failed with status ${response.status}`)
  }
  return response
}
