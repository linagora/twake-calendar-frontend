import { prepareUpdatedEvent } from '@common/features/Events/hooks/submitUpdateHelpers/utils'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'

const baseEvent = {
  URL: '/calendars/cal-1/event-1.ics',
  calId: 'cal-1',
  uid: 'event-1',
  start: '2025-01-01T10:00:00.000Z',
  end: '2025-01-01T11:00:00.000Z',
  timezone: 'Europe/Paris',
  attendee: []
} as unknown as CalendarEvent

const baseValues = {
  title: 'Updated title',
  description: '',
  location: '',
  allday: false,
  repetition: undefined,
  eventClass: 'PUBLIC',
  timezone: 'Europe/Paris',
  busy: 'OPAQUE',
  alarm: '-PT15M',
  meetingLink: '',
  attendees: [],
  selectedResources: []
} as any

describe('prepareUpdatedEvent', () => {
  it('sets alarm attendee and summary at VAlarm construction time', () => {
    const updatedEvent = prepareUpdatedEvent({
      event: baseEvent,
      values: baseValues,
      startISO: '2025-01-01T10:00:00.000Z',
      endISO: '2025-01-01T11:00:00.000Z',
      timeChanged: false,
      targetCalendar: {
        id: 'cal-1',
        owner: { emails: ['owner@example.com'] }
      } as Calendar,
      calId: 'cal-1',
      newCalId: 'cal-1'
    })

    expect(updatedEvent.alarm?.attendee?.cal_address).toBe(
      'mailto:owner@example.com'
    )
    expect(updatedEvent.alarm?.summary).toBe('Updated title')
  })
})
