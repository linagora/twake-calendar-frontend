import { getCalendars } from '@/features/Calendars/CalendarApi'

import { api } from '@/utils/apiUtils'
import { extractCalendarHrefs } from '@/utils/extractCalendarHrefs'
import { hasFreeBusyConflict } from '../../../components/Attendees/useFreeBusy'

export async function getFreeBusyForAddedAttendeesREPORT(
  userId: string,
  start: string,
  end: string
): Promise<boolean> {
  const calendars = await getCalendars(
    userId,
    'withFreeBusy=true&withRights=true'
  )
  const hrefs = extractCalendarHrefs(calendars)
  if (hrefs.length === 0) return false

  const freeBusyBody = JSON.stringify({
    type: 'free-busy-query',
    match: { start, end }
  })

  const results = await Promise.all(
    hrefs.map(href =>
      api(`dav${href}`, {
        method: 'REPORT',
        headers: { Accept: 'application/json, text/plain, */*' },
        body: freeBusyBody
      })
        .then(r => (r.ok ? r.json() : null))
        .then(data => (data ? hasFreeBusyConflict(data) : false))
        .catch(() => false)
    )
  )
  return results.some(Boolean)
}
