import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import { makeEventWithOverrides } from '@common/features/Events/transformers'

/**
 * Master series expressed as TZID local time (Europe/Ulyanovsk == UTC+4, no DST).
 */
function masterVEvent(): VCalComponent {
  return [
    'vevent',
    [
      ['uid', {}, 'text', 'uid-1'],
      [
        'dtstart',
        { tzid: 'Europe/Ulyanovsk' },
        'date-time',
        '2026-06-25T05:00:00'
      ],
      ['rrule', {}, 'recur', { freq: 'DAILY' }],
      ['summary', {}, 'text', 'Master']
    ],
    []
  ]
}

/**
 * Exception VEVENT an attendee created when accepting a single occurrence. Its
 * RECURRENCE-ID is stored in TZID wall-clock form (05:00 Ulyanovsk == 01:00Z).
 */
function attendeeOverride(): VCalComponent {
  return [
    'vevent',
    [
      ['uid', {}, 'text', 'uid-1'],
      [
        'recurrence-id',
        { tzid: 'Europe/Ulyanovsk' },
        'date-time',
        '2026-06-25T05:00:00'
      ],
      [
        'dtstart',
        { tzid: 'Europe/Ulyanovsk' },
        'date-time',
        '2026-06-25T05:00:00'
      ],
      ['summary', {}, 'text', 'Accepted occurrence'],
      [
        'attendee',
        { partstat: 'ACCEPTED' },
        'cal-address',
        'mailto:bob@example.com'
      ]
    ],
    []
  ]
}

function listOverrides(jCal: VCalComponent): VCalComponent[] {
  return (jCal[2] as VCalComponent[]).filter(
    ([name, props]) =>
      name === 'vevent' &&
      (props as VObjectProperty[]).some(([k]) => k === 'recurrence-id')
  )
}

describe('makeEventWithOverrides — RECURRENCE-ID form (#1088)', () => {
  it('replaces the existing override instead of appending a duplicate when the in-memory id is in a different date-time form', () => {
    // The organiser edits the occurrence whose in-memory RECURRENCE-ID was
    // derived from the generated series occurrence — a bare UTC value — while
    // the stored exception keeps the TZID wall-clock form. Both point at the
    // same instant (01:00Z). A plain string comparison missed the match and the
    // regenerated VEVENT was appended, producing a second RECURRENCE-ID for the
    // same occurrence that SabreDAV rejects ("Duplicate RECURRENCE-ID").
    const updatedInstance = {
      uid: 'uid-1',
      timezone: 'Europe/Ulyanovsk',
      recurrenceId: '2026-06-25T01:00:00Z',
      start: '2026-06-25T05:00:00',
      end: '2026-06-25T06:00:00',
      attendee: [],
      title: 'Updated by the organiser'
    } as unknown as CalendarEvent

    const jCal = makeEventWithOverrides(updatedInstance, [
      masterVEvent(),
      attendeeOverride()
    ])

    const overrides = listOverrides(jCal)
    expect(overrides).toHaveLength(1)

    const recurrenceId = (overrides[0][1] as VObjectProperty[]).find(
      ([k]) => k === 'recurrence-id'
    )
    expect(recurrenceId).toBeDefined()
    // The original RECURRENCE-ID tuple (TZID + wall-clock value) is preserved
    // byte-for-byte so the server still recognises the same occurrence.
    expect(recurrenceId![1]).toEqual({ tzid: 'Europe/Ulyanovsk' })
    expect(recurrenceId![3]).toBe('2026-06-25T05:00:00')
    // The VEVENT was actually regenerated from updatedInstance (replacement),
    // not merely kept untouched: its SUMMARY reflects the organiser's new title.
    const summary = (overrides[0][1] as VObjectProperty[]).find(
      ([k]) => k === 'summary'
    )
    expect(summary![3]).toBe('Updated by the organiser')
  })

  it('still matches when the stored override uses a bare UTC value and the in-memory id is wall-clock', () => {
    const overrideUtc: VCalComponent = [
      'vevent',
      [
        ['uid', {}, 'text', 'uid-1'],
        ['recurrence-id', {}, 'date-time', '2026-06-25T01:00:00Z'],
        ['dtstart', {}, 'date-time', '2026-06-25T01:00:00Z'],
        ['summary', {}, 'text', 'Accepted occurrence']
      ],
      []
    ]

    const updatedInstance = {
      uid: 'uid-1',
      timezone: 'Europe/Ulyanovsk',
      recurrenceId: '2026-06-25T05:00:00',
      start: '2026-06-25T05:00:00',
      end: '2026-06-25T06:00:00',
      attendee: [],
      title: 'Updated by the organiser'
    } as unknown as CalendarEvent

    const jCal = makeEventWithOverrides(updatedInstance, [
      masterVEvent(),
      overrideUtc
    ])

    const overrides = listOverrides(jCal)
    expect(overrides).toHaveLength(1)
    const recurrenceId = (overrides[0][1] as VObjectProperty[]).find(
      ([k]) => k === 'recurrence-id'
    )
    expect(recurrenceId![3]).toBe('2026-06-25T01:00:00Z')
    const summary = (overrides[0][1] as VObjectProperty[]).find(
      ([k]) => k === 'summary'
    )
    expect(summary![3]).toBe('Updated by the organiser')
  })
})

describe('makeEventWithOverrides — tz-naive recurrenceId of a stored override (#1882)', () => {
  function weeklyParisMaster(): VCalComponent {
    return [
      'vevent',
      [
        ['uid', {}, 'text', 'series-1'],
        [
          'dtstart',
          { tzid: 'Europe/Paris' },
          'date-time',
          '2025-03-03T09:00:00'
        ],
        ['rrule', {}, 'recur', { freq: 'WEEKLY' }]
      ],
      []
    ]
  }

  // Moved by another client: RECURRENCE-ID keeps the zone of the series,
  // DTSTART uses the new zone
  function overrideMovedToNewYork(): VCalComponent {
    return [
      'vevent',
      [
        ['uid', {}, 'text', 'series-1'],
        [
          'recurrence-id',
          { tzid: 'Europe/Paris' },
          'date-time',
          '2025-03-10T09:00:00'
        ],
        [
          'dtstart',
          { tzid: 'America/New_York' },
          'date-time',
          '2025-03-10T09:00:00'
        ],
        ['summary', {}, 'text', 'Moved to New York']
      ],
      []
    ]
  }

  // The override as parseFetchedEvent reads it: the RECURRENCE-ID value
  // without its TZID
  function editedOccurrence(timezone: string): CalendarEvent {
    return {
      uid: 'series-1',
      timezone,
      recurrenceId: '2025-03-10T09:00:00',
      start: '2025-03-10T13:00:00.000Z',
      end: '2025-03-10T14:00:00.000Z',
      attendee: [],
      title: 'Edited'
    } as unknown as CalendarEvent
  }

  function expectReplacedOverride(jCal: VCalComponent): void {
    const vevents = (jCal[2] as VCalComponent[]).filter(
      ([name]) => name === 'vevent'
    )
    expect(vevents).toHaveLength(2)
    const props = vevents[1][1]
    expect(props).toContainEqual([
      'recurrence-id',
      { tzid: 'Europe/Paris' },
      'date-time',
      '2025-03-10T09:00:00'
    ])
    expect(props).toContainEqual(['summary', {}, 'text', 'Edited'])
  }

  it('replaces the override when its RECURRENCE-ID zone is not the DTSTART zone of the edited occurrence', () => {
    const jCal = makeEventWithOverrides(editedOccurrence('America/New_York'), [
      weeklyParisMaster(),
      overrideMovedToNewYork()
    ])

    expectReplacedOverride(jCal)
  })

  it('replaces the override when the zone of the occurrence is changed in the form', () => {
    const jCal = makeEventWithOverrides(editedOccurrence('Asia/Ho_Chi_Minh'), [
      weeklyParisMaster(),
      overrideMovedToNewYork()
    ])

    expectReplacedOverride(jCal)
  })
})

describe('makeEventWithOverrides — zone named like an Object.prototype member (#1887)', () => {
  it.each(['toString', 'constructor', 'hasOwnProperty'])(
    'writes the occurrence of a series in the %s zone',
    timezone => {
      const updatedInstance = {
        uid: 'uid-1',
        timezone,
        recurrenceId: '2026-06-25T05:00:00',
        start: '2026-06-25T05:00:00',
        end: '2026-06-25T06:00:00',
        attendee: [],
        title: 'Updated by the organiser'
      } as unknown as CalendarEvent

      const jCal = makeEventWithOverrides(updatedInstance, [masterVEvent()])

      expect(listOverrides(jCal)).toHaveLength(1)
    }
  )
})

describe('makeEventWithOverrides — Windows TZID RECURRENCE-ID (#1884)', () => {
  function windowsOverride(tzid: string, recurrenceId: string): VCalComponent {
    return [
      'vevent',
      [
        ['uid', {}, 'text', 'uid-1'],
        ['recurrence-id', { tzid }, 'date-time', recurrenceId],
        ['dtstart', { tzid }, 'date-time', recurrenceId],
        ['summary', {}, 'text', 'Moved occurrence']
      ],
      []
    ]
  }

  function editedInstance(
    recurrenceId: string,
    timezone: string
  ): CalendarEvent {
    return {
      uid: 'uid-1',
      timezone,
      recurrenceId,
      start: '2026-06-25T05:00:00',
      end: '2026-06-25T06:00:00',
      attendee: [],
      title: 'Updated by the organiser'
    } as unknown as CalendarEvent
  }

  function recurrenceIds(jCal: VCalComponent): VObjectProperty[] {
    return listOverrides(jCal).flatMap(([, props]) =>
      (props as VObjectProperty[]).filter(([k]) => k === 'recurrence-id')
    )
  }

  it('replaces a Windows TZID override instead of appending a duplicate RECURRENCE-ID', () => {
    // 03:00 "Romance Standard Time" (Europe/Paris, summer) == 01:00Z
    const jCal = makeEventWithOverrides(
      editedInstance('2025-09-30T01:00:00Z', 'Europe/Paris'),
      [
        masterVEvent(),
        windowsOverride('Romance Standard Time', '2025-09-30T03:00:00')
      ]
    )

    expect(recurrenceIds(jCal)).toEqual([
      [
        'recurrence-id',
        { tzid: 'Romance Standard Time' },
        'date-time',
        '2025-09-30T03:00:00'
      ]
    ])
  })

  it('does not replace a Windows TZID override of another instant sharing the wall clock', () => {
    // 03:00 "Eastern Standard Time" == 07:00Z, not 03:00Z
    const other = windowsOverride(
      'Eastern Standard Time',
      '2033-09-10T03:00:00'
    )

    const jCal = makeEventWithOverrides(
      editedInstance('2033-09-10T03:00:00Z', 'America/St_Johns'),
      [masterVEvent(), other]
    )

    expect(listOverrides(jCal)).toHaveLength(2)
    expect(listOverrides(jCal)[0]).toEqual(other)
  })

  it('reads an unknown TZID in the series timezone rather than as a bare wall clock', () => {
    // "toString" resolves to no zone: 12:15 is read in Europe/Ulyanovsk (08:15Z)
    const other = windowsOverride('toString', '2030-06-04T12:15:00')

    const jCal = makeEventWithOverrides(
      editedInstance('2030-06-04T12:15:00Z', 'Europe/Paris'),
      [masterVEvent(), other]
    )

    expect(listOverrides(jCal)).toHaveLength(2)
    expect(listOverrides(jCal)[0]).toEqual(other)
  })
})

describe('makeEventWithOverrides — VTIMEZONEs of the series (#1881)', () => {
  const updatedInstance = {
    uid: 'series-1',
    timezone: 'Europe/Paris',
    recurrenceId: '2025-06-02T07:00:00Z',
    start: '2025-06-02T09:00:00',
    end: '2025-06-02T10:00:00',
    attendee: [],
    title: 'Edited occurrence'
  } as unknown as CalendarEvent

  function series(tzid: string): VCalComponent[] {
    return [
      [
        'vevent',
        [
          ['uid', {}, 'text', 'series-1'],
          ['dtstart', { tzid }, 'date-time', '2025-03-03T09:00:00'],
          ['rrule', {}, 'recur', { freq: 'WEEKLY' }]
        ],
        []
      ],
      [
        'vevent',
        [
          ['uid', {}, 'text', 'series-1'],
          ['recurrence-id', { tzid }, 'date-time', '2025-03-10T09:00:00'],
          [
            'dtstart',
            { tzid: 'Asia/Tokyo' },
            'date-time',
            '2025-03-10T17:00:00'
          ]
        ],
        []
      ]
    ]
  }

  function vtimezones(jCal: VCalComponent): VCalComponent[] {
    return (jCal[2] as VCalComponent[]).filter(([name]) => name === 'vtimezone')
  }

  function tzidsOf(jCal: VCalComponent): unknown[] {
    return vtimezones(jCal).map(
      ([, props]) =>
        (props as VObjectProperty[]).find(([k]) => k === 'tzid')?.[3]
    )
  }

  it('writes a VTIMEZONE for every TZID of the series', () => {
    const jCal = makeEventWithOverrides(updatedInstance, series('Europe/Paris'))

    expect(tzidsOf(jCal)).toEqual(['Europe/Paris', 'Asia/Tokyo'])
  })

  it('keeps the stored VTIMEZONE of a TZID the client does not know by name', () => {
    const storedVtimezone: VCalComponent = [
      'vtimezone',
      [['tzid', {}, 'text', 'europe/paris']],
      [
        [
          'standard',
          [
            ['dtstart', {}, 'date-time', '1970-01-01T00:00:00'],
            ['tzoffsetfrom', {}, 'utc-offset', '+01:00'],
            ['tzoffsetto', {}, 'utc-offset', '+01:00']
          ],
          []
        ]
      ]
    ]

    const jCal = makeEventWithOverrides(
      updatedInstance,
      series('europe/paris'),
      [storedVtimezone]
    )

    const tzids = tzidsOf(jCal)
    expect(tzids).toEqual(
      expect.arrayContaining(['europe/paris', 'Europe/Paris', 'Asia/Tokyo'])
    )
    expect(new Set(tzids).size).toBe(tzids.length)
    expect(vtimezones(jCal)).toContainEqual(storedVtimezone)
  })
})

describe('makeEventWithOverrides — floating override after a zone change (#1938)', () => {
  function floatingMaster(): VCalComponent {
    return [
      'vevent',
      [
        ['uid', {}, 'text', 'series-1'],
        ['dtstart', {}, 'date-time', '2022-08-02T09:45:00'],
        ['duration', {}, 'duration', 'PT1H'],
        ['rrule', {}, 'recur', { freq: 'WEEKLY' }],
        ['summary', {}, 'text', 'Weekly sync']
      ],
      []
    ]
  }

  function floatingOverride(): VCalComponent {
    return [
      'vevent',
      [
        ['uid', {}, 'text', 'series-1'],
        ['recurrence-id', {}, 'date-time', '2022-08-09T09:45:00'],
        ['dtstart', {}, 'date-time', '2022-08-09T10:00:00'],
        ['duration', {}, 'duration', 'PT1H'],
        ['summary', {}, 'text', 'Weekly sync (moved)']
      ],
      []
    ]
  }

  function editedOccurrence(
    recurrenceId: string,
    timezone: string
  ): CalendarEvent {
    return {
      uid: `series-1/${recurrenceId}`,
      recurrenceId,
      timezone,
      start: '2022-08-09T12:00:00.000Z',
      end: '2022-08-09T13:00:00.000Z',
      attendee: [],
      title: 'Weekly sync, edited'
    } as unknown as CalendarEvent
  }

  function propertyOf(
    vevent: VCalComponent,
    name: string
  ): VObjectProperty | undefined {
    return vevent[1].find(([k]) => k === name)
  }

  it.each(['Europe/Paris', 'Romance Standard Time'])(
    'replaces a floating override when the zone is changed to %s in the form',
    timezone => {
      // The REPORT expands the floating series in UTC: 09:45 is 09:45Z
      const jCal = makeEventWithOverrides(
        editedOccurrence('2022-08-09T09:45:00Z', timezone),
        [floatingMaster(), floatingOverride()]
      )

      const overrides = listOverrides(jCal)
      expect(overrides).toHaveLength(1)
      expect(propertyOf(overrides[0], 'recurrence-id')).toEqual([
        'recurrence-id',
        {},
        'date-time',
        '2022-08-09T09:45:00'
      ])
      expect(propertyOf(overrides[0], 'summary')?.[3]).toBe(
        'Weekly sync, edited'
      )
    }
  )

  it('does not replace a floating override of another occurrence', () => {
    const jCal = makeEventWithOverrides(
      editedOccurrence('2022-08-16T09:45:00Z', 'Europe/Paris'),
      [floatingMaster(), floatingOverride()]
    )

    expect(listOverrides(jCal)).toHaveLength(2)
    expect(listOverrides(jCal)[0]).toEqual(floatingOverride())
  })
})
