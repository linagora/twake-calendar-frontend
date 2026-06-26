import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { makeSearchEventParam } from '@common/features/Events/transformers/makeSearchEventParam'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { userAttendee } from '@common/features/User/models/attendee'
import { clientConfig } from '@common/features/User/oidcAuth'
import { CalendarEvent } from '@common/types/EventsTypes'
import { VAlarm } from '@common/types/VAlarm'
import { Valarms } from '@common/types/Valarms'

clientConfig.url = 'https://example.com'

const day = new Date()

const mockEvent = {
  uid: 'event1',
  title: 'Test Event',
  timezone: 'UTC',
  calId: '667037022b752d0026472254/cal1',
  URL: '/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics',
  start: day.toISOString(),
  end: day.toISOString(),
  status: 'PUBLIC',
  organizer: { cn: 'test', cal_address: 'test@test.com' },
  attendee: [
    new userAttendee({
      cn: 'test',
      cal_address: 'test@test.com',
      partstat: 'NEEDS-ACTION',
      rsvp: 'TRUE',
      role: 'REQ-PARTICIPANT',
      cutype: 'INDIVIDUAL'
    }),
    new userAttendee({
      cn: 'John',
      cal_address: 'john@test.com',
      partstat: 'NEEDS-ACTION',
      rsvp: 'TRUE',
      role: 'REQ-PARTICIPANT',
      cutype: 'INDIVIDUAL'
    })
  ]
} as CalendarEvent

const mockVevents: VCalComponent[] = [
  [
    'vevent',
    [
      ['uid', {}, 'text', 'event1'],
      ['dtstart', {}, 'date-time', '2024-02-01T10:00:00Z'],
      ['dtend', {}, 'date-time', '2024-02-01T11:00:00Z'],
      ['rrule', {}, 'recur', { freq: 'DAILY' }],
      ['summary', {}, 'text', 'Old title'],
      ['sequence', {}, 'integer', 1]
    ],
    []
  ],
  [
    'vevent',
    [
      ['uid', {}, 'text', 'event1'],
      ['recurrence-id', {}, 'date-time', '2024-02-02T10:00:00Z'],
      ['dtstart', {}, 'date-time', '2024-02-02T10:00:00Z'],
      ['dtend', {}, 'date-time', '2024-02-02T11:00:00Z'],
      ['summary', {}, 'text', 'Old title'],
      ['sequence', {}, 'integer', 1]
    ],
    []
  ]
]

function getOverrideFromJCal(jCal: any) {
  const vevents = jCal[2].filter(([n]: any) => n === 'vevent')
  return vevents.find(([, props]: any) =>
    props.some(([k]: any) => k === 'recurrence-id')
  )
}

function getProp(override: any, key: string) {
  return override[1].find(([k]: any) => k === key)
}

describe('makeSearchEventParam', () => {
  const mockFilters = {
    searchIn: ['user1/calendar1', 'user2/calendar2'],
    keywords: 'meeting',
    organizers: ['org@example.com'],
    attendees: ['part@example.com']
  }

  it('should make search params with correct parameters', async () => {
    const searchParams = makeSearchEventParam('test', mockFilters)
    expect(searchParams).toEqual({
      query: 'meeting',
      calendars: [
        { calendarId: 'calendar1', userId: 'user1' },
        { calendarId: 'calendar2', userId: 'user2' }
      ],
      organizers: ['org@example.com'],
      attendees: ['part@example.com']
    })
  })

  it('should use query param when keywords is empty', async () => {
    const searchParams = makeSearchEventParam('fallback query', {
      ...mockFilters,
      keywords: ''
    })

    expect(searchParams.query).toBe('fallback query')
  })

  it('should omit organizers when empty', async () => {
    const searchParams = makeSearchEventParam('test', {
      ...mockFilters,
      organizers: []
    })

    expect(searchParams.organizers).toBeUndefined()
  })

  it('should omit participants when empty', async () => {
    const searchParams = makeSearchEventParam('test', {
      ...mockFilters,
      attendees: []
    })

    expect(searchParams.attendees).toBeUndefined()
  })
})

describe('makeSeriesJCal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('propagates summary changes to overrides', async () => {
    const jCal = makeSeriesJCal(
      mockVevents,
      { ...mockEvent, title: 'New title' } as any,
      { removeOverrides: false }
    )

    const override = getOverrideFromJCal(jCal)

    const summary = getProp(override, 'summary')
    expect(summary[3]).toBe('New title')
  })

  it('does not remove recurrence-id from overrides', async () => {
    const jCal = makeSeriesJCal(mockVevents, mockEvent as any, {
      removeOverrides: false
    })

    const override = getOverrideFromJCal(jCal)

    expect(override).toBeDefined()
  })

  it('increments SEQUENCE on overrides when metadata changes', async () => {
    const jCal = makeSeriesJCal(
      mockVevents,
      { ...mockEvent, title: 'Changed title' } as any,
      { removeOverrides: false }
    )

    const override = getOverrideFromJCal(jCal)
    const sequence = getProp(override, 'sequence')
    expect(sequence[3]).toBe(2)
  })

  it('propagates description, location, class, and transp changes', async () => {
    const veventsWithMultipleFields: VCalComponent[] = [
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['dtstart', {}, 'date-time', '2024-02-01T10:00:00Z'],
          ['dtend', {}, 'date-time', '2024-02-01T11:00:00Z'],
          ['rrule', {}, 'recur', { freq: 'DAILY' }],
          ['summary', {}, 'text', 'Title'],
          ['description', {}, 'text', 'Old description'],
          ['location', {}, 'text', 'Old location'],
          ['class', {}, 'text', 'PUBLIC'],
          ['transp', {}, 'text', 'OPAQUE'],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ],
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['recurrence-id', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['dtstart', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['dtend', {}, 'date-time', '2024-02-02T11:00:00Z'],
          ['summary', {}, 'text', 'Title'],
          ['description', {}, 'text', 'Old description'],
          ['location', {}, 'text', 'Old location'],
          ['class', {}, 'text', 'PUBLIC'],
          ['transp', {}, 'text', 'OPAQUE'],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ]
    ]

    const jCal = makeSeriesJCal(
      veventsWithMultipleFields,
      {
        ...mockEvent,
        description: 'New description',
        location: 'New location',
        class: 'PRIVATE',
        transp: 'TRANSPARENT'
      } as any,
      { removeOverrides: false }
    )

    const override = getOverrideFromJCal(jCal)

    const description = getProp(override, 'description')
    const location = getProp(override, 'location')
    const classField = getProp(override, 'class')
    const transp = getProp(override, 'transp')

    expect(description[3]).toBe('New description')
    expect(location[3]).toBe('New location')
    expect(classField[3]).toBe('PRIVATE')
    expect(transp[3]).toBe('TRANSPARENT')
  })

  it('propagates organizer changes', async () => {
    const veventsWithOrganizer: VCalComponent[] = [
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['dtstart', {}, 'date-time', '2024-02-01T10:00:00Z'],
          ['rrule', {}, 'recur', { freq: 'DAILY' }],
          ['summary', {}, 'text', 'Title'],
          [
            'organizer',
            { cn: 'Alice' },
            'cal-address',
            'mailto:alice@example.com'
          ],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ],
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['recurrence-id', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['dtstart', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['summary', {}, 'text', 'Title'],
          [
            'organizer',
            { cn: 'Alice' },
            'cal-address',
            'mailto:alice@example.com'
          ],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ]
    ]

    const jCal = makeSeriesJCal(
      veventsWithOrganizer,
      {
        ...mockEvent,
        organizer: { cn: 'Bob', cal_address: 'bob@example.com' }
      } as any,
      { removeOverrides: false }
    )
    const override = getOverrideFromJCal(jCal)

    const organizer = getProp(override, 'organizer')
    expect(organizer[3]).toBe('mailto:bob@example.com')
    expect(organizer[1].cn).toBe('Bob')
  })

  it('propagates attendee changes', async () => {
    const veventsWithAttendees: VCalComponent[] = [
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['dtstart', {}, 'date-time', '2024-02-01T10:00:00Z'],
          ['rrule', {}, 'recur', { freq: 'DAILY' }],
          ['summary', {}, 'text', 'Title'],
          [
            'attendee',
            { cn: 'Alice' },
            'cal-address',
            'mailto:alice@example.com'
          ],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ],
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['recurrence-id', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['dtstart', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['summary', {}, 'text', 'Title'],
          [
            'attendee',
            { cn: 'Alice' },
            'cal-address',
            'mailto:alice@example.com'
          ],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ]
    ]

    const jCal = makeSeriesJCal(
      veventsWithAttendees,
      {
        ...mockEvent,
        attendee: [
          new userAttendee({
            cn: 'Bob',
            cal_address: 'bob@example.com',
            partstat: 'NEEDS-ACTION',
            cutype: 'INDIVIDUAL',
            role: 'REQ-PARTICIPANT',
            rsvp: 'TRUE'
          }),
          new userAttendee({
            cn: 'Charlie',
            cal_address: 'charlie@example.com',
            partstat: 'NEEDS-ACTION',
            cutype: 'INDIVIDUAL',
            role: 'REQ-PARTICIPANT',
            rsvp: 'TRUE'
          })
        ]
      } as any,
      { removeOverrides: false }
    )

    const override = getOverrideFromJCal(jCal)

    const attendees = override[1].filter(([k]: any) => k === 'attendee')
    expect(attendees).toHaveLength(2)
    expect(attendees[0][3]).toBe('mailto:bob@example.com')
    expect(attendees[1][3]).toBe('mailto:charlie@example.com')
  })

  it('propagates x-openpaas-videoconference changes', async () => {
    const veventsWithVideo: VCalComponent[] = [
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['dtstart', {}, 'date-time', '2024-02-01T10:00:00Z'],
          ['rrule', {}, 'recur', { freq: 'DAILY' }],
          ['summary', {}, 'text', 'Title'],
          ['x-openpaas-videoconference', {}, 'unknown', 'https://meet.old.com'],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ],
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['recurrence-id', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['dtstart', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['summary', {}, 'text', 'Title'],
          ['x-openpaas-videoconference', {}, 'unknown', 'https://meet.old.com'],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ]
    ]

    const jCal = makeSeriesJCal(
      veventsWithVideo,
      {
        ...mockEvent,
        x_openpass_videoconference: 'https://meet.new.com'
      } as any,
      { removeOverrides: false }
    )

    const override = getOverrideFromJCal(jCal)

    const videoconf = getProp(override, 'x-openpaas-videoconference')
    expect(videoconf[3]).toBe('https://meet.new.com')
  })

  it('works with multiple override instances', async () => {
    const veventsMultipleOverrides: VCalComponent[] = [
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['dtstart', {}, 'date-time', '2024-02-01T10:00:00Z'],
          ['dtend', {}, 'date-time', '2024-02-01T11:00:00Z'],
          ['rrule', {}, 'recur', { freq: 'DAILY' }],
          ['summary', {}, 'text', 'Old'],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ],
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['recurrence-id', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['dtstart', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['dtend', {}, 'date-time', '2024-02-02T11:00:00Z'],
          ['summary', {}, 'text', 'Old'],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ],
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['recurrence-id', {}, 'date-time', '2024-02-03T10:00:00Z'],
          ['dtstart', {}, 'date-time', '2024-02-03T10:00:00Z'],
          ['dtend', {}, 'date-time', '2024-02-03T11:00:00Z'],
          ['summary', {}, 'text', 'Old'],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ]
    ]
    const jCal = makeSeriesJCal(
      veventsMultipleOverrides,
      { ...mockEvent, title: 'New title' } as any,
      { removeOverrides: false }
    )

    const veventsResult = jCal[2].filter(([n]: any) => n === 'vevent')
    const overrides = veventsResult.filter(([, props]: any) =>
      props.some(([k]: any) => k === 'recurrence-id')
    )

    expect(overrides).toHaveLength(2)
    overrides.forEach(override => {
      const summary = override[1].find(([k]: any) => k === 'summary')
      const sequence = override[1].find(([k]: any) => k === 'sequence')
      expect(summary[3]).toBe('New title')
      expect(sequence[3]).toBe(2)
    })
  })

  it('adds sequence field when missing and metadata changes', async () => {
    const veventsNoSequence: VCalComponent[] = [
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['dtstart', {}, 'date-time', '2024-02-01T10:00:00Z'],
          ['dtend', {}, 'date-time', '2024-02-01T11:00:00Z'],
          ['rrule', {}, 'recur', { freq: 'DAILY' }],
          ['summary', {}, 'text', 'Old']
        ],
        []
      ],
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['recurrence-id', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['dtstart', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['dtend', {}, 'date-time', '2024-02-02T11:00:00Z'],
          ['summary', {}, 'text', 'Old']
        ],
        []
      ]
    ]

    const jCal = makeSeriesJCal(
      veventsNoSequence,
      { ...mockEvent, title: 'New title' } as any,
      { removeOverrides: false }
    )

    const override = getOverrideFromJCal(jCal)

    const sequence = override[1].find(([k]: any) => k === 'sequence')
    expect(sequence[3]).toBe(1)
  })

  it('preserves override-specific fields when propagating metadata', async () => {
    const veventsCustomFields: VCalComponent[] = [
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['dtstart', {}, 'date-time', '2024-02-01T10:00:00Z'],
          ['dtend', {}, 'date-time', '2024-02-01T11:00:00Z'],
          ['rrule', {}, 'recur', { freq: 'DAILY' }],
          ['summary', {}, 'text', 'Old'],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ],
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event1'],
          ['recurrence-id', {}, 'date-time', '2024-02-02T10:00:00Z'],
          ['dtstart', {}, 'date-time', '2024-02-02T14:00:00Z'],
          ['dtend', {}, 'date-time', '2024-02-02T15:00:00Z'],
          ['summary', {}, 'text', 'Old'],
          ['description', {}, 'text', 'custom-value'],
          ['sequence', {}, 'integer', 1]
        ],
        []
      ]
    ]
    const jCal = makeSeriesJCal(
      veventsCustomFields,
      { ...mockEvent, title: 'New title' } as any,
      { removeOverrides: false }
    )
    const override = getOverrideFromJCal(jCal)

    const summary = getProp(override, 'summary')
    const dtstart = getProp(override, 'dtstart')
    const dtend = getProp(override, 'dtend')
    const description = getProp(override, 'description')
    const recurrenceId = getProp(override, 'recurrence-id')
    // Summary should be updated
    expect(summary[3]).toBe('New title')
    // Override-specific time should be preserved
    expect(dtstart[3]).toBe('2024-02-02T14:00:00Z')
    expect(dtend[3]).toBe('2024-02-02T15:00:00Z')
    // Custom field should be preserved
    expect(description[3]).toBe('custom-value')
    // Recurrence-id should be preserved
    expect(recurrenceId[3]).toBe('2024-02-02T10:00:00Z')
  })

  const recurringWithAlarmVevents: VCalComponent[] = [
    [
      'vevent',
      [
        ['uid', {}, 'text', 'event1'],
        ['dtstart', {}, 'date-time', '2024-02-01T10:00:00Z'],
        ['rrule', {}, 'recur', { freq: 'DAILY' }],
        ['summary', {}, 'text', 'Old']
      ],
      [
        [
          'valarm',
          [
            ['action', {}, 'text', 'DISPLAY'],
            ['trigger', {}, 'duration', '-PT15M']
          ],
          []
        ]
      ]
    ],
    [
      'vevent',
      [
        ['uid', {}, 'text', 'event1'],
        ['recurrence-id', {}, 'date-time', '2024-02-02T10:00:00Z'],
        ['dtstart', {}, 'date-time', '2024-02-02T10:00:00Z'],
        ['summary', {}, 'text', 'Old']
      ],
      [
        [
          'valarm',
          [
            ['action', {}, 'text', 'DISPLAY'],
            ['trigger', {}, 'duration', '-PT15M']
          ],
          []
        ]
      ]
    ]
  ]

  it('replaces VALARM on overrides when alarms changes', async () => {
    const jCal = makeSeriesJCal(
      recurringWithAlarmVevents,
      {
        ...mockEvent,
        alarms: new Valarms([
          new VAlarm({ action: 'EMAIL', trigger: '-PT30M' })
        ])
      } as any,
      { removeOverrides: false }
    )

    const override = getOverrideFromJCal(jCal)

    const alarms = override[2].filter(([n]: any) => n === 'valarm')

    expect(alarms).toHaveLength(1)
    const action = alarms[0][1].find(([k]: any) => k === 'action')
    const trigger = alarms[0][1].find(([k]: any) => k === 'trigger')
    expect(action[3]).toBe('EMAIL')
    expect(trigger[3]).toBe('-PT30M')
  })

  it('filters out source override when sourceRecurrenceId is passed', async () => {
    const jCal = makeSeriesJCal(mockVevents, mockEvent as any, {
      removeOverrides: false,
      sourceRecurrenceId: '2024-02-02T10:00:00Z'
    })

    const override = getOverrideFromJCal(jCal)
    expect(override).toBeUndefined()
  })
})
