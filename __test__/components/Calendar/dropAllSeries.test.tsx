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

jest.mock('@common/features/Events/EventDao', () => ({
  fetchEvent: jest.fn()
}))
jest.mock('@common/features/Events/transformers', () => ({
  parseFetchedEvent: jest.fn()
}))
jest.mock(
  '@common/features/Events/hooks/submitUpdateHelpers/updateActions',
  () => ({ handleUpdateRecurringSeries: jest.fn() })
)

const calId = 'user1/cal1'
const DAY_MS = 24 * 60 * 60 * 1000

type AfterChoice = (type: 'solo' | 'all' | undefined) => Promise<void>

async function dropAllSeries(
  master: CalendarEvent,
  instance: CalendarEvent,
  deltaDays: number
): Promise<Parameters<typeof handleUpdateRecurringSeries>[0]> {
  ;(fetchEvent as jest.Mock).mockResolvedValue({})
  ;(parseFetchedEvent as jest.Mock).mockImplementation(
    (_event: CalendarEvent, _response: unknown, isMaster?: boolean) =>
      isMaster ? master : instance
  )
  const calendar = {
    id: calId,
    events: { [instance.uid]: instance }
  } as unknown as Calendar
  const setAfterChoiceFunc = jest.fn<void, [() => AfterChoice]>()

  const handlers = createEventHandlers({
    dispatch: jest.fn(),
    calendars: { [calId]: calendar },
    setSelectedEvent: jest.fn(),
    setOpenEditModePopup: jest.fn(),
    setAfterChoiceFunc,
    timezone: 'Europe/Paris'
  } as unknown as EventHandlersProps)

  await handlers.handleEventDrop({
    event: { extendedProps: { uid: instance.uid, calId } },
    delta: { years: 0, months: 0, days: deltaDays, milliseconds: 0 }
  } as unknown as EventDropArg)

  const afterChoice = setAfterChoiceFunc.mock.calls[0][0]()
  await afterChoice('all')

  return jest.mocked(handleUpdateRecurringSeries).mock.calls[0][0]
}

describe('Dropping an occurrence with "All the events" (#1668)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
})
