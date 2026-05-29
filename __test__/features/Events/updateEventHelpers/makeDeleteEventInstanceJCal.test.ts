import {
  VObjectProperty,
  VCalComponent
} from '@/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { makeDeleteEventInstanceJCal } from '@/features/Events/transformers'

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
