/**
 * @vitest-environment jsdom
 */

import { prepareUpdatedEvent } from '@common/features/Events/hooks/submitUpdateHelpers/utils'

vi.mock('p-map', () => ({ default: vi.fn() }))
import { userAttendee } from '@common/features/User/models/attendee'
import { userOrganiser } from '@common/features/User/userDataTypes'
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
  describe('team calendar organizer handling', () => {
    it('does NOT set organizer for team calendar when there are no attendees', () => {
      const teamCalendar = {
        id: 'team-cal-1',
        owner: {
          teamCalendar: true,
          emails: ['team@example.com']
        }
      } as Calendar

      const eventWithOrganizer = {
        ...baseEvent,
        organizer: {
          cn: 'Previous Organizer',
          cal_address: 'mailto:prev@example.com'
        }
      } as CalendarEvent

      const valuesNoAttendees = {
        ...baseValues,
        attendees: [],
        selectedResources: []
      }

      const updatedEvent = prepareUpdatedEvent({
        event: eventWithOrganizer,
        values: valuesNoAttendees,
        startISO: '2025-01-01T10:00:00.000Z',
        endISO: '2025-01-01T11:00:00.000Z',
        timeChanged: false,
        targetCalendar: teamCalendar,
        calId: 'team-cal-1',
        newCalId: 'team-cal-1'
      })

      expect(updatedEvent.organizer).toBeUndefined()
      expect(updatedEvent.attendee).toEqual([])
    })

    it('SETS organizer for team calendar when there ARE attendees', () => {
      const teamCalendar = {
        id: 'team-cal-1',
        owner: {
          teamCalendar: true,
          emails: ['team@example.com']
        }
      } as Calendar

      const eventWithOrganizer = {
        ...baseEvent,
        organizer: {
          cn: 'Previous Organizer',
          cal_address: 'mailto:prev@example.com'
        }
      } as CalendarEvent

      const valuesWithAttendees = {
        ...baseValues,
        attendees: [
          new userAttendee({
            cal_address: 'mailto:attendee@example.com',
            cn: 'Attendee'
          })
        ],
        selectedResources: []
      }

      const updatedEvent = prepareUpdatedEvent({
        event: eventWithOrganizer,
        values: valuesWithAttendees,
        startISO: '2025-01-01T10:00:00.000Z',
        endISO: '2025-01-01T11:00:00.000Z',
        timeChanged: false,
        targetCalendar: teamCalendar,
        calId: 'team-cal-1',
        newCalId: 'team-cal-1'
      })

      expect(updatedEvent.organizer).toBeDefined()
      expect(updatedEvent.organizer?.cal_address).toBe(
        'mailto:prev@example.com'
      )
    })

    it('SETS organizer for regular (non-team) calendar even without attendees', () => {
      const regularCalendar = {
        id: 'user-cal-1',
        owner: {
          teamCalendar: false,
          emails: ['user@example.com']
        }
      } as Calendar

      const eventWithOrganizer = {
        ...baseEvent,
        organizer: {
          cn: 'Previous Organizer',
          cal_address: 'mailto:prev@example.com'
        }
      } as CalendarEvent

      const valuesNoAttendees = {
        ...baseValues,
        attendees: [],
        selectedResources: []
      }

      const updatedEvent = prepareUpdatedEvent({
        event: eventWithOrganizer,
        values: valuesNoAttendees,
        startISO: '2025-01-01T10:00:00.000Z',
        endISO: '2025-01-01T11:00:00.000Z',
        timeChanged: false,
        targetCalendar: regularCalendar,
        calId: 'user-cal-1',
        newCalId: 'user-cal-1'
      })

      expect(updatedEvent.organizer).toBeDefined()
      expect(updatedEvent.organizer?.cal_address).toBe(
        'mailto:prev@example.com'
      )
    })
  })

  describe('server stamped organizer parameters', () => {
    const attendeeCalendar = {
      id: 'bob-cal',
      owner: { emails: ['bob@example.com'] }
    } as Calendar

    const storedOrganizer = new userOrganiser({
      cn: 'alice alice',
      cal_address: 'alice@example.com',
      otherParams: { 'schedule-status': '1.0' }
    })

    const update = (organizer: userOrganiser): CalendarEvent =>
      prepareUpdatedEvent({
        event: { ...baseEvent, organizer: storedOrganizer } as CalendarEvent,
        values: baseValues,
        organizer,
        startISO: '2025-01-01T10:00:00.000Z',
        endISO: '2025-01-01T11:00:00.000Z',
        timeChanged: false,
        targetCalendar: attendeeCalendar,
        calId: 'bob-cal',
        newCalId: 'bob-cal'
      })

    it('writes back the SCHEDULE-STATUS of the unchanged organizer', () => {
      const updatedEvent = update(
        new userOrganiser({
          cn: 'alice alice',
          cal_address: 'alice@example.com'
        })
      )

      expect(updatedEvent.organizer?.asJcal()).toEqual([
        'organizer',
        { 'schedule-status': '1.0', cn: 'alice alice' },
        'cal-address',
        'mailto:alice@example.com'
      ])
    })

    it('writes the parameters back in their stored order', () => {
      // the scheduling plugin compares the serialized ORGANIZER: a reordering is a change
      const updatedEvent = prepareUpdatedEvent({
        event: {
          ...baseEvent,
          organizer: new userOrganiser({
            cn: 'alice alice',
            cal_address: 'alice@example.com',
            otherParams: { 'schedule-status': '1.0' },
            paramOrder: ['cn', 'schedule-status']
          })
        } as CalendarEvent,
        values: baseValues,
        organizer: new userOrganiser({
          cn: 'alice alice',
          cal_address: 'alice@example.com'
        }),
        startISO: '2025-01-01T10:00:00.000Z',
        endISO: '2025-01-01T11:00:00.000Z',
        timeChanged: false,
        targetCalendar: attendeeCalendar,
        calId: 'bob-cal',
        newCalId: 'bob-cal'
      })

      expect(Object.keys(updatedEvent.organizer?.asJcal()[1] ?? {})).toEqual([
        'cn',
        'schedule-status'
      ])
    })

    it('drops them when the organizer changes', () => {
      const updatedEvent = update(
        new userOrganiser({ cn: 'Carol', cal_address: 'carol@example.com' })
      )

      expect(updatedEvent.organizer?.asJcal()).toEqual([
        'organizer',
        { cn: 'Carol' },
        'cal-address',
        'mailto:carol@example.com'
      ])
    })

    it('drops inherited parameters from a replacement organizer', () => {
      const updatedEvent = update(
        new userOrganiser({
          cn: 'Carol',
          cal_address: 'carol@example.com',
          otherParams: { 'schedule-status': '1.0' }
        })
      )

      expect(updatedEvent.organizer?.asJcal()).toEqual([
        'organizer',
        { cn: 'Carol' },
        'cal-address',
        'mailto:carol@example.com'
      ])
    })
  })

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

  it('saves a spaces-only title as an empty one (#1515)', () => {
    const updatedEvent = prepareUpdatedEvent({
      event: baseEvent,
      values: { ...baseValues, title: '   ' },
      startISO: '2025-01-01T10:00:00.000Z',
      endISO: '2025-01-01T11:00:00.000Z',
      timeChanged: false,
      targetCalendar: { id: 'cal-1' } as Calendar,
      calId: 'cal-1',
      newCalId: 'cal-1'
    })

    expect(updatedEvent.title).toBe('')
    expect(updatedEvent.alarms?.getAlarm(0)?.summary).toBe('')
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

    // The alarm should preserve its original attendee (owner)
    // because prepareUpdatedEvent preserves existing attendees
    const alarm = updatedEvent.alarms?.getAlarm(0)
    expect(alarm?.attendees).toHaveLength(1)
    expect(alarm?.attendees?.[0]?.cal_address).toBe('mailto:owner@example.com')
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
