import {
  VObjectProperty,
  VCalComponent
} from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import { makeDeleteEventInstanceJCal } from '@common/features/Events/transformers'

/** Minimal jCal VEVENT with no recurrence-id → master event */
function makeMasterVEvent(extraProps: VObjectProperty[] = []): VCalComponent {
  return [
    'vevent',
    [
      ['uid', {}, 'text', 'event-uid-1'],
      ['dtstart', {}, 'date-time', '2024-03-15T10:00:00'],
      ['rrule', {}, 'recur', { freq: 'WEEKLY' }],
      ...extraProps
    ],
    []
  ]
}

/** Minimal jCal VEVENT with a recurrence-id → override instance */
function makeOverrideVEvent(
  recurrenceId: string,
  dtstart = recurrenceId
): VCalComponent {
  return [
    'vevent',
    [
      ['uid', {}, 'text', 'event-uid-1'],
      ['recurrence-id', {}, 'date-time', recurrenceId],
      ['dtstart', {}, 'date-time', dtstart],
      ['summary', {}, 'text', 'Override instance']
    ],
    []
  ]
}

const baseCalendarEvent: CalendarEvent = {
  id: 'event-uid-1',
  calId: 'cal-1',
  start: '2024-03-15T10:00:00',
  recurrenceId: null
} as unknown as CalendarEvent

beforeEach(() => {
  jest.clearAllMocks()
})

describe('makeDeleteEventInstanceJCal', () => {
  describe('when no master VEVENT exists', () => {
    it('throws an error', () => {
      const onlyOverride: VCalComponent[] = [
        makeOverrideVEvent('2024-03-15T10:00:00')
      ]

      expect(() =>
        makeDeleteEventInstanceJCal(onlyOverride, baseCalendarEvent)
      ).toThrow('No master VEVENT found for this series')
    })
  })

  describe('EXDATE handling', () => {
    it('adds an EXDATE property using recurrenceId when present', () => {
      const event: CalendarEvent = {
        ...baseCalendarEvent,
        recurrenceId: '2024-03-15T10:00:00'
      } as unknown as CalendarEvent
      const vevents: VCalComponent[] = [makeMasterVEvent()]

      const result = makeDeleteEventInstanceJCal(vevents, event)

      const masterProps = result[2][0][1] as VObjectProperty[]
      const exdate = masterProps.find(([k]) => k === 'exdate')
      expect(exdate).toBeDefined()
      expect(exdate![3]).toBe('2024-03-15T10:00:00')
    })

    it('falls back to event.start when recurrenceId is null', () => {
      const vevents: VCalComponent[] = [makeMasterVEvent()]

      const result = makeDeleteEventInstanceJCal(vevents, baseCalendarEvent)

      const masterProps = result[2][0][1] as VObjectProperty[]
      const exdate = masterProps.find(([k]) => k === 'exdate')
      expect(exdate).toBeDefined()
      expect(exdate![3]).toBe(baseCalendarEvent.start)
    })

    it('uses value type "date" for all-day events', () => {
      const vevents: VCalComponent[] = [
        [
          'vevent',
          [
            ['uid', {}, 'text', 'event-uid-1'],
            ['dtstart', {}, 'date', '2024-03-15'],
            ['rrule', {}, 'recur', { freq: 'WEEKLY' }]
          ],
          []
        ],
        [
          'vevent',
          [
            ['uid', {}, 'text', 'event-uid-1'],
            ['dtstart', {}, 'date', '2024-03-15'],
            ['recurrence-id', {}, 'date', '2024-03-15']
          ],
          []
        ]
      ]

      const result = makeDeleteEventInstanceJCal(vevents, baseCalendarEvent)

      const masterProps = result[2][0][1] as VObjectProperty[]
      const exdate = masterProps.find(([k]) => k === 'exdate')
      expect(exdate![2]).toBe('date')
    })

    it('uses value type "date-time" for timed events', () => {
      const vevents: VCalComponent[] = [makeMasterVEvent()]

      const result = makeDeleteEventInstanceJCal(vevents, baseCalendarEvent)

      const masterProps = result[2][0][1] as VObjectProperty[]
      const exdate = masterProps.find(([k]) => k === 'exdate')
      expect(exdate![2]).toBe('date-time')
    })

    it('removes the override VEVENT when the deleted event is itself an override instance', () => {
      const overrideRecurrenceId = '2024-03-22T10:00:00'

      const overrideVEvent = makeOverrideVEvent(overrideRecurrenceId)
      const vevents: VCalComponent[] = [makeMasterVEvent(), overrideVEvent]

      const deletedEvent: CalendarEvent = {
        ...baseCalendarEvent,
        recurrenceId: overrideRecurrenceId
      } as unknown as CalendarEvent

      const result = makeDeleteEventInstanceJCal(vevents, deletedEvent)

      const components = result[2] as VCalComponent[]

      const remainingVevents = components.filter(([name]) => name === 'vevent')
      expect(remainingVevents).toHaveLength(1)
      const hasOverride = remainingVevents.some(([, props]) =>
        (props as VObjectProperty[]).some(([k]) => k === 'recurrence-id')
      )
      expect(hasOverride).toBe(false)

      const masterProps = remainingVevents[0][1] as VObjectProperty[]
      const exdate = masterProps.find(([k]) => k === 'exdate')
      expect(exdate).toBeDefined()
      expect(exdate![3]).toBe(overrideRecurrenceId)
    })

    it('emits the EXDATE in the same TZID form as the master DTSTART (#1088)', () => {
      // Master DTSTART is expressed as TZID:Europe/Paris local time. The CalDAV
      // server rejects an EXDATE in bare UTC form against such a DTSTART, so the
      // EXDATE must carry the same TZID parameter and a matching local value.
      const vevents: VCalComponent[] = [
        [
          'vevent',
          [
            ['uid', {}, 'text', 'event-uid-1'],
            [
              'dtstart',
              { tzid: 'Europe/Paris' },
              'date-time',
              '2024-03-15T11:00:00'
            ],
            ['rrule', {}, 'recur', { freq: 'WEEKLY' }]
          ],
          []
        ]
      ]
      // Occurrence to delete, expressed in UTC (10:00Z === 11:00 Europe/Paris).
      const event: CalendarEvent = {
        ...baseCalendarEvent,
        recurrenceId: '2024-03-15T10:00:00Z'
      } as unknown as CalendarEvent

      const result = makeDeleteEventInstanceJCal(vevents, event)

      const masterProps = result[2][0][1] as VObjectProperty[]
      const exdate = masterProps.find(([k]) => k === 'exdate')
      expect(exdate).toBeDefined()
      expect(exdate![1]).toEqual({ tzid: 'Europe/Paris' })
      expect(exdate![2]).toBe('date-time')
      // Local wall-clock time in Europe/Paris, no trailing Z.
      expect(exdate![3]).toBe('2024-03-15T11:00:00')
    })

    it('does not add a duplicate EXDATE when one already matches', () => {
      const existingExdate: VObjectProperty = [
        'exdate',
        {},
        'date-time',
        '2024-03-15T10:00:00' // same as event.start, no trailing Z
      ]
      const vevents: VCalComponent[] = [makeMasterVEvent([existingExdate])]

      const result = makeDeleteEventInstanceJCal(vevents, baseCalendarEvent)

      const masterProps = result[2][0][1] as VObjectProperty[]
      const exdates = masterProps.filter(([k]) => k === 'exdate')
      expect(exdates).toHaveLength(1)
    })

    it('treats a trailing Z as equivalent to the same datetime without Z (normalisation)', () => {
      const existingExdate: VObjectProperty = [
        'exdate',
        {},
        'date-time',
        '2024-03-15T10:00:00Z' // has trailing Z
      ]
      const event: CalendarEvent = {
        ...baseCalendarEvent,
        start: '2024-03-15T10:00:00' // no Z
      } as unknown as CalendarEvent
      const vevents: VCalComponent[] = [makeMasterVEvent([existingExdate])]

      const result = makeDeleteEventInstanceJCal(vevents, event)

      const masterProps = result[2][0][1] as VObjectProperty[]
      const exdates = masterProps.filter(([k]) => k === 'exdate')
      expect(exdates).toHaveLength(1) // duplicate detected → not added again
    })
  })

  describe('override instance removal', () => {
    it('removes a matching override instance from the vevents array', () => {
      const override = makeOverrideVEvent('2024-03-15T10:00:00')
      const vevents: VCalComponent[] = [makeMasterVEvent(), override]

      const result = makeDeleteEventInstanceJCal(vevents, baseCalendarEvent)

      const components = result[2] as VCalComponent[]
      const remainingVevents = components.filter(([name]) => name === 'vevent')
      expect(remainingVevents).toHaveLength(1)

      const hasOverride = remainingVevents.some(([, props]) =>
        (props as VObjectProperty[]).some(([k]) => k === 'recurrence-id')
      )
      expect(hasOverride).toBe(false)
    })

    it('keeps override instances that do not match the deleted occurrence', () => {
      const matchingOverride = makeOverrideVEvent('2024-03-15T10:00:00')
      const otherOverride = makeOverrideVEvent('2024-03-22T10:00:00')
      const vevents: VCalComponent[] = [
        makeMasterVEvent(),
        matchingOverride,
        otherOverride
      ]

      const result = makeDeleteEventInstanceJCal(vevents, baseCalendarEvent)

      const components = result[2] as VCalComponent[]
      const remainingVevents = components.filter(([name]) => name === 'vevent')
      // master + unrelated override remain
      expect(remainingVevents).toHaveLength(2)
    })

    it('keeps master even when no override instances are present', () => {
      const vevents: VCalComponent[] = [makeMasterVEvent()]

      const result = makeDeleteEventInstanceJCal(vevents, baseCalendarEvent)

      const components = result[2] as VCalComponent[]
      const remainingVevents = components.filter(([name]) => name === 'vevent')
      expect(remainingVevents).toHaveLength(1)
    })
  })

  describe('cross-timezone form handling (#1088)', () => {
    /** Master series in Europe/Ulyanovsk local time (UTC+4, no DST). */
    function ulyanovskMaster(extraProps: VObjectProperty[] = []): VCalComponent {
      return [
        'vevent',
        [
          ['uid', {}, 'text', 'event-uid-1'],
          [
            'dtstart',
            { tzid: 'Europe/Ulyanovsk' },
            'date-time',
            '2026-06-25T05:00:00'
          ],
          ['rrule', {}, 'recur', { freq: 'DAILY' }],
          ...extraProps
        ],
        []
      ]
    }

    it('emits the EXDATE in TZID form when deleting an occurrence expressed in UTC', () => {
      // 01:00Z === 05:00 Europe/Ulyanovsk.
      const event: CalendarEvent = {
        ...baseCalendarEvent,
        recurrenceId: '2026-06-25T01:00:00Z'
      } as unknown as CalendarEvent

      const result = makeDeleteEventInstanceJCal([ulyanovskMaster()], event)

      const masterProps = result[2][0][1] as VObjectProperty[]
      const exdate = masterProps.find(([k]) => k === 'exdate')
      expect(exdate).toBeDefined()
      expect(exdate![1]).toEqual({ tzid: 'Europe/Ulyanovsk' })
      expect(exdate![2]).toBe('date-time')
      expect(exdate![3]).toBe('2026-06-25T05:00:00')
    })

    it('does not add a duplicate EXDATE when an existing one points at the same instant in another form', () => {
      const existingExdate: VObjectProperty = [
        'exdate',
        {},
        'date-time',
        '2026-06-25T01:00:00Z' // bare UTC form, same instant as 05:00 Ulyanovsk
      ]
      const event: CalendarEvent = {
        ...baseCalendarEvent,
        recurrenceId: '2026-06-25T05:00:00' // wall-clock, no tzid param
      } as unknown as CalendarEvent

      const result = makeDeleteEventInstanceJCal(
        [ulyanovskMaster([existingExdate])],
        event
      )

      const masterProps = result[2][0][1] as VObjectProperty[]
      const exdates = masterProps.filter(([k]) => k === 'exdate')
      expect(exdates).toHaveLength(1)
    })

    it('reads an upper-cased TZID parameter when deduplicating an existing EXDATE', () => {
      // ICAL.js usually lowercases parameter names, but the TZID lookup stays
      // case-insensitive (getTzidParam). An EXDATE stored with `TZID` must still
      // resolve to its instant so the matching deletion is recognised as a dup.
      const existingExdate: VObjectProperty = [
        'exdate',
        { TZID: 'Europe/Ulyanovsk' },
        'date-time',
        '2026-06-25T05:00:00'
      ]
      const event: CalendarEvent = {
        ...baseCalendarEvent,
        recurrenceId: '2026-06-25T01:00:00Z' // same instant, bare UTC form
      } as unknown as CalendarEvent

      const result = makeDeleteEventInstanceJCal(
        [ulyanovskMaster([existingExdate])],
        event
      )

      const masterProps = result[2][0][1] as VObjectProperty[]
      const exdates = masterProps.filter(([k]) => k === 'exdate')
      expect(exdates).toHaveLength(1)
    })

    it('removes a matching override whose RECURRENCE-ID is stored in a different form', () => {
      const override: VCalComponent = [
        'vevent',
        [
          ['uid', {}, 'text', 'event-uid-1'],
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
          ['summary', {}, 'text', 'Accepted occurrence']
        ],
        []
      ]
      const event: CalendarEvent = {
        ...baseCalendarEvent,
        recurrenceId: '2026-06-25T01:00:00Z' // same instant, UTC form
      } as unknown as CalendarEvent

      const result = makeDeleteEventInstanceJCal(
        [ulyanovskMaster(), override],
        event
      )

      const remainingVevents = (result[2] as VCalComponent[]).filter(
        ([name]) => name === 'vevent'
      )
      expect(remainingVevents).toHaveLength(1)
      const hasOverride = remainingVevents.some(([, props]) =>
        (props as VObjectProperty[]).some(([k]) => k === 'recurrence-id')
      )
      expect(hasOverride).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles a recurrenceId with a trailing Z correctly when adding EXDATE', () => {
      const event: CalendarEvent = {
        ...baseCalendarEvent,
        recurrenceId: '2024-03-15T10:00:00Z'
      } as unknown as CalendarEvent
      const vevents: VCalComponent[] = [makeMasterVEvent()]

      const result = makeDeleteEventInstanceJCal(vevents, event)

      const masterProps = result[2][0][1] as VObjectProperty[]
      const exdate = masterProps.find(([k]) => k === 'exdate')
      // The raw recurrenceId (with Z) is stored as-is; normalisation is only for comparison
      expect(exdate![3]).toBe('2024-03-15T10:00:00Z')
    })
  })
})
