import type { MockedFunction } from 'vitest'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { fetchEvent } from '@common/features/Events/EventDao'
import { keepStoredSchedule } from '@common/features/Events/keepStoredSchedule'
import { CalendarEvent } from '@common/types/EventsTypes'

// A factory keeps the real DAO out: its api client reads `window` on import,
// which the node test environment does not provide
vi.mock('@common/features/Events/EventDao', () => ({
  fetchEvent: vi.fn()
}))

const mockedFetchEvent = fetchEvent as MockedFunction<typeof fetchEvent>

// The organizer wrote the event at 11:00-12:00 in Europe/Paris
const storedJCal = [
  'vcalendar',
  [],
  [
    [
      'vevent',
      [
        ['uid', {}, 'text', 'event-1'],
        ['summary', {}, 'text', 'Guest card'],
        [
          'dtstart',
          { tzid: 'Europe/Paris' },
          'date-time',
          '2026-10-07T11:00:00'
        ],
        ['dtend', { tzid: 'Europe/Paris' }, 'date-time', '2026-10-07T12:00:00']
      ],
      []
    ]
  ]
]

// The same event, as loaded by a viewer in UTC from the calendar REPORT
const viewerEvent = {
  uid: 'event-1',
  calId: 'bob/bob',
  URL: '/calendars/bob/bob/event-1.ics',
  title: 'Guest card',
  start: '2026-10-07T09:00:00.000Z',
  end: '2026-10-07T10:00:00.000Z',
  timezone: 'UTC',
  allday: false
} as CalendarEvent

const viewerFormValues = {
  title: 'Guest card',
  start: '2026-10-07T09:00',
  end: '2026-10-07T10:00',
  timezone: 'UTC',
  allday: false,
  busy: 'TRANSPARENT'
} as EventFormValues

describe('keepStoredSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes the dates back in the zone of the stored calendar object', async () => {
    mockedFetchEvent.mockResolvedValue(storedJCal as never)

    const values = await keepStoredSchedule(viewerFormValues, viewerEvent)

    expect(values).toEqual({
      ...viewerFormValues,
      start: '2026-10-07T11:00',
      end: '2026-10-07T12:00',
      timezone: 'Europe/Paris'
    })
  })

  it('keeps the personal settings of the form', async () => {
    mockedFetchEvent.mockResolvedValue(storedJCal as never)

    const values = await keepStoredSchedule(viewerFormValues, viewerEvent)

    expect(values.busy).toBe('TRANSPARENT')
  })

  it('keeps the form values when the stored event cannot be fetched', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedFetchEvent.mockRejectedValue(new Error('network'))

    const values = await keepStoredSchedule(viewerFormValues, viewerEvent)

    expect(values).toBe(viewerFormValues)
  })

  it('leaves occurrences of a series untouched', async () => {
    const occurrence = { ...viewerEvent, uid: 'event-1/20261007T090000' }

    const values = await keepStoredSchedule(viewerFormValues, occurrence)

    expect(values).toBe(viewerFormValues)
    expect(mockedFetchEvent).not.toHaveBeenCalled()
  })

  it('leaves all-day events untouched', async () => {
    const allDay = { ...viewerEvent, allday: true }

    const values = await keepStoredSchedule(viewerFormValues, allDay)

    expect(values).toBe(viewerFormValues)
    expect(mockedFetchEvent).not.toHaveBeenCalled()
  })
})
