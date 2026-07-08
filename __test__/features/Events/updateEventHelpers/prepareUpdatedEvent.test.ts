import { prepareUpdatedEvent } from '@common/features/Events/hooks/submitUpdateHelpers/utils'
import { userAttendee } from '@common/features/User/models/attendee'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { VAlarm } from '@common/types/VAlarm'
import { Valarms } from '@common/types/Valarms'

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
  alarms: new Valarms([new VAlarm({ trigger: '-PT15M', action: 'EMAIL' })]),
  meetingLink: '',
  attendees: [],
  selectedResources: []
} as any

describe('prepareUpdatedEvent', () => {
  it('sets alarm attendees and summary at VAlarm construction time', () => {
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

    expect(updatedEvent.alarms?.getAlarm(0)?.attendees?.[0]?.cal_address).toBe(
      'mailto:owner@example.com'
    )
    expect(updatedEvent.alarms?.getAlarm(0)?.summary).toBe('Updated title')
  })

  it('preserves multiple alarms when modifying non-alarm fields', () => {
    const eventWithMultipleAlarms = {
      ...baseEvent,
      alarms: new Valarms([
        new VAlarm({ trigger: '-PT15M', action: 'EMAIL' }),
        new VAlarm({ trigger: '-PT30M', action: 'DISPLAY' }),
        new VAlarm({ trigger: '-PT1H', action: 'EMAIL' })
      ])
    } as unknown as CalendarEvent

    // Update only the title, not touching alarms
    const valuesWithUpdatedTitle = {
      ...baseValues,
      title: 'Modified Title',
      alarms: new Valarms([
        new VAlarm({ trigger: '-PT15M', action: 'EMAIL' }),
        new VAlarm({ trigger: '-PT30M', action: 'DISPLAY' }),
        new VAlarm({ trigger: '-PT1H', action: 'EMAIL' })
      ])
    }

    const updatedEvent = prepareUpdatedEvent({
      event: eventWithMultipleAlarms,
      values: valuesWithUpdatedTitle,
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

    // Verify all 3 alarms are preserved
    expect(updatedEvent.alarms?.count()).toBe(3)
    expect(updatedEvent.alarms?.getAlarm(0)?.trigger).toBe('-PT15M')
    expect(updatedEvent.alarms?.getAlarm(0)?.action).toBe('EMAIL')
    expect(updatedEvent.alarms?.getAlarm(1)?.trigger).toBe('-PT30M')
    expect(updatedEvent.alarms?.getAlarm(1)?.action).toBe('DISPLAY')
    expect(updatedEvent.alarms?.getAlarm(2)?.trigger).toBe('-PT1H')
    expect(updatedEvent.alarms?.getAlarm(2)?.action).toBe('EMAIL')

    // Verify title was updated
    expect(updatedEvent.title).toBe('Modified Title')

    // Verify other event properties are unchanged
    expect(updatedEvent.location).toBe('')
    expect(updatedEvent.description).toBe('')
  })

  it('converts personal alarm to global alarm when adding attendees', () => {
    // Start with a single-user event that has a personal alarm
    const singleUserEvent = {
      ...baseEvent,
      alarms: new Valarms([
        new VAlarm({
          trigger: '-PT10M',
          action: 'EMAIL',
          attendees: [
            new userAttendee({
              cal_address: 'mailto:owner@example.com',
              cn: 'Owner'
            })
          ]
        })
      ])
    } as unknown as CalendarEvent

    // Now add another attendee
    const valuesWithNewAttendee = {
      ...baseValues,
      attendees: [
        new userAttendee({
          cal_address: 'mailto:other@example.com',
          cn: 'Other'
        })
      ],
      alarms: new Valarms([
        new VAlarm({
          trigger: '-PT10M',
          action: 'EMAIL',
          attendees: [
            new userAttendee({
              cal_address: 'mailto:owner@example.com',
              cn: 'Owner'
            })
          ]
        })
      ])
    }

    const updatedEvent = prepareUpdatedEvent({
      event: singleUserEvent,
      values: valuesWithNewAttendee,
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

    // The alarm should now have both attendees (owner + other)
    const alarm = updatedEvent.alarms?.getAlarm(0)
    expect(alarm?.attendees).toHaveLength(2)
    expect(alarm?.attendees?.map(a => a.cal_address)).toContain(
      'mailto:owner@example.com'
    )
    expect(alarm?.attendees?.map(a => a.cal_address)).toContain(
      'mailto:other@example.com'
    )
  })

  it('keeps personal alarm when event stays single-user', () => {
    const singleUserEvent = {
      ...baseEvent,
      alarms: new Valarms([
        new VAlarm({
          trigger: '-PT10M',
          action: 'EMAIL',
          attendees: [
            new userAttendee({
              cal_address: 'mailto:owner@example.com',
              cn: 'Owner'
            })
          ]
        })
      ])
    } as unknown as CalendarEvent

    const valuesSingleUser = {
      ...baseValues,
      attendees: [],
      alarms: new Valarms([
        new VAlarm({
          trigger: '-PT10M',
          action: 'EMAIL',
          attendees: [
            new userAttendee({
              cal_address: 'mailto:owner@example.com',
              cn: 'Owner'
            })
          ]
        })
      ])
    }

    const updatedEvent = prepareUpdatedEvent({
      event: singleUserEvent,
      values: valuesSingleUser,
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

    // The alarm should still have only the owner as attendee
    const alarm = updatedEvent.alarms?.getAlarm(0)
    expect(alarm?.attendees).toHaveLength(1)
    expect(alarm?.attendees?.[0]?.cal_address).toBe('mailto:owner@example.com')
  })
})
