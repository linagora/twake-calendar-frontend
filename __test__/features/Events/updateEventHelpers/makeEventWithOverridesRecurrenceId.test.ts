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
