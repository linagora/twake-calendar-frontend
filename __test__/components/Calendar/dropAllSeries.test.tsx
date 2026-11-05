import type { Mock } from 'vitest'
import {
  createEventHandlers,
  EventHandlersProps
} from '@common/components/Calendar/handlers/eventHandlers'
import { fetchEvent } from '@common/features/Events/EventDao'
import { handleUpdateRecurringSeries } from '@common/features/Events/hooks/submitUpdateHelpers/updateActions'
import { parseFetchedEvent } from '@common/features/Events/transformers'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'
import { EventDropArg } from '@fullcalendar/core'

vi.mock('@common/features/Events/EventDao', () => ({
  fetchEvent: vi.fn()
}))
vi.mock('@common/features/Events/transformers', () => ({
  parseFetchedEvent: vi.fn()
}))
vi.mock(
  '@common/features/Events/hooks/submitUpdateHelpers/updateActions',
  () => ({ handleUpdateRecurringSeries: vi.fn() })
)

const calId = 'user1/cal1'
const DAY_MS = 24 * 60 * 60 * 1000

type AfterChoice = (type: 'solo' | 'all' | undefined) => Promise<void>

async function dropAllSeries(
  master: CalendarEvent,
  instance: CalendarEvent,
  deltaDays: number,
  { milliseconds = 0, response = {} } = {} as {
    milliseconds?: number
    response?: unknown
  }
): Promise<Parameters<typeof handleUpdateRecurringSeries>[0]> {
  ;(fetchEvent as Mock).mockResolvedValue(response)
  ;(parseFetchedEvent as Mock).mockImplementation(
    (_event: CalendarEvent, _response: unknown, isMaster?: boolean) =>
      isMaster ? master : instance
  )
  const calendar = {
    id: calId,
    events: { [instance.uid]: instance }
  } as unknown as Calendar
  const setAfterChoiceFunc = vi.fn<void, [() => AfterChoice]>()

  const handlers = createEventHandlers({
    dispatch: vi.fn(),
    calendars: { [calId]: calendar },
    setSelectedEvent: vi.fn(),
    setOpenEditModePopup: vi.fn(),
    setAfterChoiceFunc,
    timezone: 'Europe/Paris'
  } as unknown as EventHandlersProps)

  await handlers.handleEventDrop({
    event: { extendedProps: { uid: instance.uid, calId } },
    delta: { years: 0, months: 0, days: deltaDays, milliseconds }
  } as unknown as EventDropArg)

  const afterChoice = setAfterChoiceFunc.mock.calls[0][0]()
  await afterChoice('all')

  return vi.mocked(handleUpdateRecurringSeries).mock.calls[0][0]
}

describe('Dropping an occurrence with "All the events" (#1668)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('moves the weekdays of an all-day weekly series with the dropped day', async () => {
    const repetition = new RepetitionObject({
      freq: 'weekly',
      interval: 1,
      occurrences: 3,
      byday: ['MO']
    })
    const master = {
      uid: 'series',
      calId,
      title: 'Weekly',
      start: '2026-10-19',
      end: '2026-10-20',
      allday: true,
      repetition
    } as CalendarEvent
    const instance = {
      ...master,
      uid: 'series/20261026',
      start: '2026-10-26',
      end: '2026-10-27',
      recurrenceId: '2026-10-26'
    } as CalendarEvent

    const params = await dropAllSeries(master, instance, 1)

    expect(params.values.start).toBe('2026-10-20T00:00:00.000Z')
    expect(params.values.repetition.byday).toEqual(['TU'])
    expect(params.newEvent.repetition?.byday).toEqual(['TU'])
    expect(params.newEvent.repetition).toBeInstanceOf(RepetitionObject)
    expect(params.newEvent.repetition?.occurrences).toBe(3)
  })

  it('moves the weekdays of a timed weekly series in the zone of DTSTART', async () => {
    const repetition = new RepetitionObject({
      freq: 'weekly',
      interval: 1,
      occurrences: 3,
      byday: ['MO', 'WE']
    })
    const master = {
      uid: 'series',
      calId,
      title: 'Weekly',
      start: '2026-10-19T08:00:00Z',
      end: '2026-10-19T09:00:00Z',
      allday: false,
      timezone: 'UTC',
      repetition
    } as CalendarEvent
    const instance = {
      ...master,
      uid: 'series/20261026T080000',
      start: '2026-10-26T08:00:00Z',
      end: '2026-10-26T09:00:00Z',
      recurrenceId: '2026-10-26T08:00:00Z'
    } as CalendarEvent

    const params = await dropAllSeries(master, instance, -1)

    expect(new Date(params.values.start).getTime()).toBe(
      new Date('2026-10-19T08:00:00Z').getTime() - DAY_MS
    )
    expect(params.values.repetition.byday).toEqual(['SU', 'TU'])
    expect(params.newEvent.repetition?.byday).toEqual(['SU', 'TU'])
  })

  describe('in a zone only the VTIMEZONE of the object defines (#1941)', () => {
    const HOUR_MS = 60 * 60 * 1000
    const CUSTOM_ZONE = 'Customized Time Zone'
    // UTC-5 all year
    const response = [
      'vcalendar',
      [],
      [
        [
          'vtimezone',
          [['tzid', {}, 'text', CUSTOM_ZONE]],
          [
            [
              'standard',
              [
                ['dtstart', {}, 'date-time', '1970-01-01T00:00:00'],
                ['tzoffsetfrom', {}, 'utc-offset', '-05:00'],
                ['tzoffsetto', {}, 'utc-offset', '-05:00']
              ],
              []
            ]
          ]
        ]
      ]
    ]

    const seriesAt = (
      masterStart: string,
      instanceStart: string
    ): [CalendarEvent, CalendarEvent] => {
      const master = {
        uid: 'series',
        calId,
        title: 'Weekly',
        allday: false,
        repetition: new RepetitionObject({
          freq: 'weekly',
          interval: 1,
          occurrences: 3,
          byday: ['MO']
        }),
        timezone: CUSTOM_ZONE,
        start: masterStart,
        end: new Date(Date.parse(masterStart) + HOUR_MS).toISOString()
      } as CalendarEvent
      const instance = {
        ...master,
        uid: 'series/20260824',
        start: instanceStart,
        end: new Date(Date.parse(instanceStart) + HOUR_MS).toISOString(),
        recurrenceId: instanceStart
      } as CalendarEvent
      return [master, instance]
    }

    it('moves the weekdays when the move crosses midnight in that zone', async () => {
      const [master, instance] = seriesAt(
        '2026-08-17T05:00:00.000Z', // Monday 00:00 in the zone
        '2026-08-24T05:00:00.000Z'
      )

      const params = await dropAllSeries(master, instance, 0, {
        milliseconds: -HOUR_MS,
        response
      })

      expect(params.values.start).toBe('2026-08-17T04:00:00.000Z')
      expect(params.values.repetition.byday).toEqual(['SU'])
      expect(params.seriesDayChanged).toBe(true)
    })

    it('keeps the weekdays when the move only crosses midnight in UTC', async () => {
      const [master, instance] = seriesAt(
        '2026-08-18T01:00:00.000Z', // Monday 20:00 in the zone
        '2026-08-25T01:00:00.000Z'
      )

      const params = await dropAllSeries(master, instance, 0, {
        milliseconds: -2 * HOUR_MS,
        response
      })

      expect(params.values.start).toBe('2026-08-17T23:00:00.000Z')
      expect(params.values.repetition.byday).toEqual(['MO'])
      expect(params.seriesDayChanged).toBe(false)
    })

    it('reads a wall clock recurrence id in that zone', async () => {
      const [master, instance] = seriesAt(
        '2026-08-17T05:00:00.000Z',
        '2026-08-24T05:00:00.000Z'
      )

      const params = await dropAllSeries(
        master,
        { ...instance, recurrenceId: '2026-08-24T00:00:00' },
        0,
        { milliseconds: HOUR_MS, response }
      )

      expect(params.values.start).toBe('2026-08-17T06:00:00.000Z')
      expect(params.seriesDayChanged).toBe(false)
    })
  })
})
