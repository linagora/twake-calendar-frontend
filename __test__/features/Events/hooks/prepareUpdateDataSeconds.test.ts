/**
 * @vitest-environment jsdom
 */

import {
  buildDefaultNewEvent,
  buildFromExistingEvent
} from '@common/components/Event/utils/eventInitialValuesHelpers'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { PrepareUpdateDataResult } from '@common/features/Events/hooks/submitUpdateHelpers/types'
import { prepareUpdateData } from '@common/features/Events/hooks/submitUpdateHelpers/utils'
import { userAttendee } from '@common/features/User/models/attendee'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'

vi.mock('p-map', () => ({ default: vi.fn() }))

const organizer = new userOrganiser({
  cn: 'User',
  cal_address: 'user@example.com'
})
const cal = {
  id: 'u1/cal1',
  name: 'Personal',
  color: {},
  owner: { emails: ['user@example.com'] },
  events: {}
} as unknown as Calendar
const calList = { 'u1/cal1': cal }

const eventWithSeconds = (
  start: string,
  end: string,
  timezone: string
): CalendarEvent => ({
  uid: 'event-1',
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-1.ics',
  title: 'Review',
  start,
  end,
  allday: false,
  timezone,
  organizer,
  attendee: [
    new userAttendee({
      cal_address: 'bob@example.com',
      partstat: 'ACCEPTED',
      rsvp: 'FALSE'
    })
  ]
})

const formValues = (event: CalendarEvent): EventFormValues =>
  ({
    ...buildDefaultNewEvent({
      timezone: 'Europe/Paris',
      calendarid: 'u1/cal1'
    }),
    ...buildFromExistingEvent({
      event,
      resolvedCalendarTimezone: 'Europe/Paris',
      calList,
      userId: 'u1',
      defaultCalendarId: 'u1/cal1',
      organizer,
      calId: 'u1/cal1'
    })
  }) as EventFormValues

const save = (
  event: CalendarEvent,
  values: EventFormValues
): PrepareUpdateDataResult => {
  const result = prepareUpdateData({
    event,
    values,
    organizer,
    calList,
    showMore: false,
    calId: 'u1/cal1',
    eventId: 'event-1',
    t: (k: string) => k
  })
  if (!result) throw new Error('no update data prepared')
  return result
}

const bob = (event: CalendarEvent): userAttendee | undefined =>
  event.attendee.find(a => a.cal_address === 'bob@example.com')

describe('prepareUpdateData - DTSTART/DTEND with seconds (#1905)', () => {
  it('an unchanged save keeps the seconds and the answers', () => {
    const event = eventWithSeconds(
      '2025-09-15T10:00:30Z',
      '2025-09-15T11:00:30Z',
      'UTC'
    )

    const { newEvent } = save(event, formValues(event))

    expect(new Date(newEvent.start).getTime()).toBe(
      Date.parse('2025-09-15T10:00:30Z')
    )
    expect(new Date(newEvent.end ?? '').getTime()).toBe(
      Date.parse('2025-09-15T11:00:30Z')
    )
    expect(bob(newEvent)).toMatchObject({ partstat: 'ACCEPTED', rsvp: 'FALSE' })
  })

  it('an unchanged save of a zoned event keeps the seconds and the answers', () => {
    const event = eventWithSeconds(
      '2025-11-02T05:30:59Z',
      '2025-11-02T07:30:59Z',
      'America/New_York'
    )

    const { newEvent } = save(event, formValues(event))

    expect(newEvent.start).toBe('2025-11-02T05:30:59.000Z')
    expect(newEvent.end).toBe('2025-11-02T07:30:59.000Z')
    expect(bob(newEvent)).toMatchObject({ partstat: 'ACCEPTED', rsvp: 'FALSE' })
  })

  it('a moved start is a time change and resets the answers', () => {
    const event = eventWithSeconds(
      '2025-09-15T10:00:30Z',
      '2025-09-15T11:00:30Z',
      'UTC'
    )
    const values = formValues(event)

    const { newEvent } = save(event, {
      ...values,
      start: '2025-09-15T09:30'
    })

    expect(newEvent.start).toBe('2025-09-15T09:30:00.000Z')
    expect(newEvent.end).toBe('2025-09-15T11:00:30.000Z')
    expect(bob(newEvent)).toMatchObject({ partstat: 'NEEDS-ACTION' })
  })
})
