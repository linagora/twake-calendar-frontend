/**
 * @vitest-environment jsdom
 */

import { buildFromSelectedRange } from '@common/components/Event/utils/initialValues/dateResolvers'
import { buildNewEvent } from '@common/features/Events/hooks/submitCreateHelpers/createAction'
import { userAttendee } from '@common/features/User/models/attendee'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'
import { VAlarm } from '@common/types/VAlarm'
import { Valarms } from '@common/types/Valarms'
import type { DateSelectArg } from '@fullcalendar/core'

vi.mock('p-map', () => ({ default: vi.fn() }))

const baseCalendar: Calendar = {
  id: 'user-1/cal-1',
  link: 'user-1/cal-1.json',
  name: 'Personal Calendar',
  owner: {
    id: 'user-1',
    emails: ['user@example.com'],
    firstname: 'John',
    lastname: 'Doe'
  },
  events: {},
  visibility: 'private'
}

const teamCalendar: Calendar = {
  id: 'team-1/cal-1',
  link: 'team-1/cal-1.json',
  name: 'Team Calendar',
  owner: {
    id: 'team-1',
    emails: ['team@example.com'],
    firstname: 'Engineering Team',
    teamCalendar: true
  },
  events: {},
  visibility: 'private'
}

const baseValues = {
  title: 'Test Event',
  description: '',
  location: '',
  start: '2025-01-15T10:00:00',
  end: '2025-01-15T11:00:00',
  allday: false,
  timezone: 'Europe/Paris',
  calendarid: 'user-1/cal-1',
  eventClass: 'PUBLIC' as const,
  busy: 'OPAQUE',
  repetition: {} as RepetitionObject,
  showRepeat: false,
  hasEndDateChanged: false,
  alarms: new Valarms([new VAlarm({ trigger: '-PT15M', action: 'EMAIL' })]),
  attendees: [],
  selectedResources: [],
  meetingLink: '',
  hasVideoConference: false,
  attachments: [],
  showDescription: false
}

describe('handleCreateEvent - team calendar organizer handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does NOT set organizer for team calendar when there are no attendees', async () => {
    const organizer = new userOrganiser({
      cn: 'Current User',
      cal_address: 'mailto:user@example.com'
    })

    const newEvent = buildNewEvent({
      values: {
        ...baseValues,
        calendarid: 'team-1/cal-1',
        attendees: [],
        selectedResources: []
      },
      targetCalendar: teamCalendar,
      showMore: true,
      organizer,
      newEventUID: '',
      t: (key: string) => key
    })

    // Organizer should be undefined for team calendar without attendees
    expect(newEvent.organizer).toBeUndefined()
    // Attendee list should also be empty (no organizer added as attendee)
    expect(newEvent.attendee).toEqual([])
  })

  it('SETS organizer for team calendar when there ARE attendees', async () => {
    const organizer = new userOrganiser({
      cn: 'Current User',
      cal_address: 'mailto:user@example.com'
    })

    const newEvent = buildNewEvent({
      values: {
        ...baseValues,
        calendarid: 'team-1/cal-1',
        attendees: [
          new userAttendee({
            cal_address: 'mailto:attendee@example.com',
            cn: 'Attendee'
          })
        ],
        selectedResources: []
      },
      targetCalendar: teamCalendar,
      showMore: true,
      organizer,
      newEventUID: '',
      t: (key: string) => key
    })

    // Organizer should be set when there are attendees
    expect(newEvent.organizer).toBeDefined()
    expect(newEvent.organizer?.cal_address).toBe('mailto:user@example.com')
    // Attendee list should contain the organizer as CHAIR plus the attendee
    expect(newEvent.attendee).toHaveLength(2)
    const organizerAttendee = newEvent.attendee?.find(
      (a: userAttendee) => a.role === 'CHAIR'
    )
    expect(organizerAttendee).toBeDefined()
    expect(organizerAttendee?.cal_address).toBe('mailto:user@example.com')
  })

  it('SETS organizer for regular (non-team) calendar even without attendees', async () => {
    const organizer = new userOrganiser({
      cn: 'Current User',
      cal_address: 'mailto:user@example.com'
    })

    const newEvent = buildNewEvent({
      values: {
        ...baseValues,
        calendarid: 'user-1/cal-1',
        attendees: [],
        selectedResources: []
      },
      targetCalendar: baseCalendar,
      showMore: true,
      organizer,
      newEventUID: '',
      t: (key: string) => key
    })

    // Organizer should be set for regular calendar even without attendees
    expect(newEvent.organizer).toBeDefined()
    expect(newEvent.organizer?.cal_address).toBe('mailto:user@example.com')
    // For regular calendars, attendee list still includes organizer as CHAIR
    expect(newEvent.attendee).toHaveLength(1)
    expect(newEvent.attendee?.[0]?.role).toBe('CHAIR')
    expect(newEvent.attendee?.[0]?.cal_address).toBe('mailto:user@example.com')
  })

  it('SETS organizer when moving event from regular to team calendar with attendees', async () => {
    const organizer = new userOrganiser({
      cn: 'Current User',
      cal_address: 'mailto:user@example.com'
    })

    const newEvent = buildNewEvent({
      values: {
        ...baseValues,
        calendarid: 'team-1/cal-1',
        attendees: [
          new userAttendee({
            cal_address: 'mailto:attendee@example.com',
            cn: 'Attendee'
          })
        ],
        selectedResources: []
      },
      targetCalendar: teamCalendar,
      showMore: true,
      organizer,
      newEventUID: '',
      t: (key: string) => key
    })

    // Organizer should be set when there are attendees, even in team calendar
    expect(newEvent.organizer).toBeDefined()
  })
})

describe('buildNewEvent - from a grid selection in another zone (#1398)', () => {
  it('keeps the selected slot when the grid is thirteen hours ahead of UTC', () => {
    // what FullCalendar hands over for 5am-6am in a Pacific/Tongatapu grid
    const selection = {
      start: new Date('2026-09-23T16:00:00Z'),
      end: new Date('2026-09-23T17:00:00Z'),
      startStr: '2026-09-24T05:00:00+13:00',
      endStr: '2026-09-24T06:00:00+13:00',
      allDay: false
    } as DateSelectArg

    const selected = buildFromSelectedRange(selection, {
      timezone: 'Pacific/Tongatapu'
    })

    const newEvent = buildNewEvent({
      values: { ...baseValues, ...selected } as typeof baseValues,
      targetCalendar: baseCalendar,
      showMore: false,
      newEventUID: 'uid',
      t: (key: string) => key
    })

    expect(selected.start).toBe('2026-09-24T05:00')
    expect(selected.end).toBe('2026-09-24T06:00')
    expect(newEvent.timezone).toBe('Pacific/Tongatapu')
    expect(newEvent.start).toBe('2026-09-23T16:00:00.000Z')
    expect(newEvent.end).toBe('2026-09-23T17:00:00.000Z')
  })
})

describe('buildNewEvent - title (#1515)', () => {
  it('saves a spaces-only title as an empty one', () => {
    const newEvent = buildNewEvent({
      values: { ...baseValues, title: '   ' },
      targetCalendar: baseCalendar,
      showMore: false,
      newEventUID: 'uid',
      t: (key: string) => key
    })

    expect(newEvent.title).toBe('')
  })

  it('trims the spaces around the title', () => {
    const newEvent = buildNewEvent({
      values: { ...baseValues, title: '  Standup  ' },
      targetCalendar: baseCalendar,
      showMore: false,
      newEventUID: 'uid',
      t: (key: string) => key
    })

    expect(newEvent.title).toBe('Standup')
  })
})

describe('buildNewEvent - weekly series on chosen weekdays (#1581)', () => {
  const weeklyOn = (byday: string[]): RepetitionObject =>
    new RepetitionObject({ freq: 'weekly', interval: 1, occurrences: 6, byday })

  const build = (values: Partial<typeof baseValues>): CalendarEvent =>
    buildNewEvent({
      values: { ...baseValues, ...values },
      targetCalendar: baseCalendar,
      showMore: true,
      newEventUID: 'uid',
      t: (key: string) => key
    })

  it('moves a Sunday start to the first selected weekday', () => {
    const newEvent = build({
      start: '2026-10-11T21:00',
      end: '2026-10-11T22:00',
      repetition: weeklyOn(['MO', 'WE', 'FR'])
    })

    expect(newEvent.start).toBe('2026-10-12T19:00:00.000Z')
    expect(newEvent.end).toBe('2026-10-12T20:00:00.000Z')
  })

  it('keeps a start already on a selected weekday', () => {
    const newEvent = build({
      start: '2026-10-14T21:00',
      end: '2026-10-14T22:00',
      repetition: weeklyOn(['MO', 'WE', 'FR'])
    })

    expect(newEvent.start).toBe('2026-10-14T19:00:00.000Z')
  })

  it('moves an all-day series past the week end', () => {
    const newEvent = build({
      allday: true,
      start: '2026-10-16',
      end: '2026-10-16',
      repetition: weeklyOn(['TU'])
    })

    expect(newEvent.start).toBe('2026-10-20T00:00:00.000Z')
    expect(newEvent.end).toBe('2026-10-21T00:00:00.000Z')
  })

  it('keeps an event spanning midnight together', () => {
    const newEvent = build({
      start: '2026-10-11T23:00',
      end: '2026-10-12T01:00',
      repetition: weeklyOn(['WE'])
    })

    expect(newEvent.start).toBe('2026-10-14T21:00:00.000Z')
    expect(newEvent.end).toBe('2026-10-14T23:00:00.000Z')
  })

  it('leaves a daily series alone', () => {
    const newEvent = build({
      start: '2026-10-11T21:00',
      end: '2026-10-11T22:00',
      repetition: new RepetitionObject({ freq: 'daily', interval: 1 })
    })

    expect(newEvent.start).toBe('2026-10-11T19:00:00.000Z')
  })
})
