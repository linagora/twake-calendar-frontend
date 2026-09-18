import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import ICAL from 'ical.js'

/**
 * Turns an ICS fixture into the jCal the DAV proxy answers to `fetchEvent`,
 * which asks for `application/calendar+json`. Tests keep writing ICS because it
 * reads better, mocks still return what the DAO really returns.
 */
export function jCalFromIcs(ics: string): VCalComponent {
  return ICAL.parse(ics) as VCalComponent
}
