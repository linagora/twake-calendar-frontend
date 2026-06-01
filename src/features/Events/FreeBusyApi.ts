import { hasFreeBusyConflict } from '@/components/Attendees/useFreeBusy'
import { extractCalendarHrefs } from '@/utils/extractCalendarHrefs'
import { extractEventBaseUuid } from '@/utils/extractEventBaseUuid'
import { fetchCalendars } from '../Calendars/CalendarDAO'
import {
  fetchFreeBusyPost,
  fetchFreeBusyReports,
  FreeBusyPostQuery
} from './FreeBusyDao'

export async function getFreeBusyForAddedAttendee(
  userId: string,
  start: string,
  end: string
): Promise<boolean> {
  const calendars = await fetchCalendars(
    userId,
    'withFreeBusy=true&withRights=true'
  )
  const hrefs = extractCalendarHrefs(calendars)
  if (hrefs.length === 0) return false

  const results = await fetchFreeBusyReports({ hrefs, start, end })
  return results.some(data => (data ? hasFreeBusyConflict(data) : false))
}

interface BusySlot {
  uid: string
  start: string
  end: string
}

interface CalendarFreeBusy {
  id: string
  busy: BusySlot[]
}

interface UserFreeBusy {
  id: string
  calendars: CalendarFreeBusy[]
}
interface FreeBusyPayload {
  users?: UserFreeBusy[]
}

export async function getFreeBusyForEventAttendees(
  userIds: string[],
  start: string,
  end: string,
  eventUid: string
): Promise<Record<string, boolean>> {
  const query: FreeBusyPostQuery = { userIds, start, end, eventUid }
  const payload = (await fetchFreeBusyPost(query)) as FreeBusyPayload
  const users = Array.isArray(payload.users) ? payload.users : []
  const eventUidBase = extractEventBaseUuid(eventUid)
  return Object.fromEntries(
    users.map(u => {
      const isBusy = (u.calendars ?? []).some(cal =>
        (cal.busy ?? []).some(
          slot => extractEventBaseUuid(slot.uid) !== eventUidBase
        )
      )
      return [u.id, isBusy]
    })
  )
}
