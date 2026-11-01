/**
 * @jest-environment jsdom
 */

import { eventSaved } from '@common/features/Events/eventSaveFeedbackSlice'
import type { PerformUpdateActionParams } from '@common/features/Events/hooks/submitUpdateHelpers/types'
import {
  DEFAULT_FORM_VALUES,
  EventFormValues
} from '@common/components/Event/EventFormFields.types'
import {
  handleUpdateSubmit,
  performUpdateAction
} from '@common/features/Events/hooks/submitUpdateHelpers/performUpdateAction'
import { HandleUpdateSubmitParams } from '@common/features/Events/hooks/submitUpdateHelpers/types'
import { prepareUpdateData } from '@common/features/Events/hooks/submitUpdateHelpers/utils'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'

jest.mock('p-map', () => jest.fn())
jest.mock('@common/features/Events/hooks/submitUpdateHelpers/utils', () => ({
  prepareUpdateData: jest.fn(() => null)
}))

const params = (typeOfAction?: 'all' | 'solo'): HandleUpdateSubmitParams => ({
  event: { uid: 'uid' } as CalendarEvent,
  values: {
    ...DEFAULT_FORM_VALUES,
    start: '2026-10-11T21:00',
    end: '2026-10-11T22:00',
    timezone: 'Europe/Paris',
    repetition: new RepetitionObject({
      freq: 'weekly',
      interval: 1,
      byday: ['MO', 'WE', 'FR']
    })
  },
  calList: {},
  showMore: true,
  calId: 'cal',
  eventId: 'uid',
  typeOfAction,
  onClose: jest.fn(),
  dispatch: jest.fn()
})

const submittedValues = (): EventFormValues =>
  jest.mocked(prepareUpdateData).mock.calls[0][0].values

describe('handleUpdateSubmit - weekly series on chosen weekdays (#1581)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('moves the series start to the first selected weekday', async () => {
    await handleUpdateSubmit(params('all'))

    expect(submittedValues().start).toBe('2026-10-12T21:00')
    expect(submittedValues().end).toBe('2026-10-12T22:00')
  })

  it('moves the start of an event turned into a weekly series', async () => {
    await handleUpdateSubmit(params())

    expect(submittedValues().start).toBe('2026-10-12T21:00')
  })

  it('keeps the date of a single occurrence', async () => {
    await handleUpdateSubmit(params('solo'))

    expect(submittedValues().start).toBe('2026-10-11T21:00')
  })
})

describe('edit save confirmation', () => {
  it.each([true, false])(
    'confirms only a successful update (success=%s)',
    async success => {
      let complete!: (result: unknown) => void
      const pending = new Promise(resolve => {
        complete = resolve
      })
      const event = {
        uid: 'uid',
        calId: 'cal',
        start: '2026-10-26T10:00:00Z'
      } as CalendarEvent
      const dispatch = jest.fn((_action: unknown) => pending)
      const saving = performUpdateAction({
        ...params(),
        newEvent: event,
        event,
        newCalId: 'cal',
        targetCalendar: { id: 'cal' },
        values: { ...DEFAULT_FORM_VALUES, repetition: {} },
        dispatch,
        tempContext: {}
      } as unknown as PerformUpdateActionParams)
      expect(
        dispatch.mock.calls.filter(([action]) => eventSaved.match(action))
      ).toHaveLength(0)
      complete({
        type: success ? 'put/fulfilled' : 'put/rejected',
        error: { message: 'Save failed' }
      })
      await saving
      const notifications = dispatch.mock.calls
        .map(([action]) => action)
        .filter(eventSaved.match)
      expect(notifications).toHaveLength(success ? 1 : 0)
      if (success)
        expect(notifications[0].payload.event).toEqual({
          ...event,
          allday: undefined
        })
    }
  )
})

describe('handleUpdateSubmit - stored series starting outside its weekdays (#1908)', () => {
  beforeEach(() => jest.clearAllMocks())

  // Monday 6 January, BYDAY=TU, as other clients may write it
  const masterEvent = {
    uid: 'event-1',
    start: '2025-01-06T10:00:00Z',
    end: '2025-01-06T11:00:00Z',
    repetition: { freq: 'weekly', byday: ['TU'] }
  } as CalendarEvent

  const seriesParams = (
    values: Partial<EventFormValues> = {}
  ): HandleUpdateSubmitParams => ({
    ...params('all'),
    event: { ...masterEvent, uid: 'event-1/20250107T100000Z' },
    masterEvent,
    values: {
      ...DEFAULT_FORM_VALUES,
      title: 'Weekly sync',
      start: '2025-01-06T10:00',
      end: '2025-01-06T11:00',
      timezone: 'UTC',
      repetition: new RepetitionObject({
        freq: 'weekly',
        interval: 1,
        byday: ['TU']
      }),
      ...values
    }
  })

  it('keeps the stored start on a save changing neither start nor weekdays', async () => {
    await handleUpdateSubmit(seriesParams())

    expect(submittedValues().start).toBe('2025-01-06T10:00')
    expect(submittedValues().end).toBe('2025-01-06T11:00')
  })

  it('realigns the start when the weekdays change', async () => {
    await handleUpdateSubmit(
      seriesParams({
        repetition: new RepetitionObject({
          freq: 'weekly',
          interval: 1,
          byday: ['WE']
        })
      })
    )

    expect(submittedValues().start).toBe('2025-01-08T10:00')
  })

  it('realigns the start when the start date changes', async () => {
    await handleUpdateSubmit(
      seriesParams({ start: '2025-01-13T10:00', end: '2025-01-13T11:00' })
    )

    expect(submittedValues().start).toBe('2025-01-14T10:00')
  })
})
