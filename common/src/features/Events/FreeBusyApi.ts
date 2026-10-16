import { hasFreeBusyConflict } from '@common/components/Attendees/useFreeBusy'
import { extractCalendarHrefs } from '@common/utils/extractCalendarHrefs'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { fetchCalendars } from '@common/features/Calendars/CalendarDAO'
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
  // Busy periods carry no uid: the server excludes the edited event itself,
  // matching on the uid of the master event, not the one of an occurrence.
  const query: FreeBusyPostQuery = {
    userIds,
    start,
    end,
    eventUid: extractEventBaseUuid(eventUid)
  }
  const payload = (await fetchFreeBusyPost(query)) as FreeBusyPayload
  const users = Array.isArray(payload.users) ? payload.users : []
  return Object.fromEntries(
    users.map(u => {
      const isBusy = (u.calendars ?? []).some(
        cal => (cal.busy ?? []).length > 0
      )
      return [u.id, isBusy]
    })
  )
}
