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
    // 03:00 "Eastern Standard Time" == 07:00Z, 03:00 St John's == 05:30Z
    const other = windowsOverride(
      'Eastern Standard Time',
      '2033-09-10T03:00:00'
    )

    const jCal = makeEventWithOverrides(
      editedInstance('2033-09-10T03:00:00', 'America/St_Johns'),
      [masterVEvent(), other]
    )

    expect(listOverrides(jCal)).toHaveLength(2)
    expect(listOverrides(jCal)[0]).toEqual(other)
  })

  it('reads an unknown TZID in the event timezone rather than as a bare wall clock', () => {
    // "toString" resolves to no zone: 12:15 is read in Europe/Paris (10:15Z)
    const other = windowsOverride('toString', '2030-06-04T12:15:00')

    const jCal = makeEventWithOverrides(
      editedInstance('2030-06-04T12:15:00Z', 'Europe/Paris'),
      [masterVEvent(), other]
    )

    expect(listOverrides(jCal)).toHaveLength(2)
    expect(listOverrides(jCal)[0]).toEqual(other)
  })
})
