import { CalendarPostBody } from '../CalendarDAO'
import { CalendarInput } from '../types/CalendarData'

export function makeAddSharedCalendarBody(
  calId: string,
  cal: CalendarInput
): CalendarPostBody {
  return JSON.stringify({
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
}
