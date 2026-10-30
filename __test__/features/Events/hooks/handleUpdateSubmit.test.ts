/**
 * @vitest-environment jsdom
 */

import {
  DEFAULT_FORM_VALUES,
  EventFormValues
} from '@common/components/Event/EventFormFields.types'
import { handleUpdateSubmit } from '@common/features/Events/hooks/submitUpdateHelpers/performUpdateAction'
import { HandleUpdateSubmitParams } from '@common/features/Events/hooks/submitUpdateHelpers/types'
import { prepareUpdateData } from '@common/features/Events/hooks/submitUpdateHelpers/utils'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'

vi.mock('p-map', () => ({ default: vi.fn() }))
vi.mock('@common/features/Events/hooks/submitUpdateHelpers/utils', () => ({
  prepareUpdateData: vi.fn(() => null)
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
  onClose: vi.fn(),
  dispatch: vi.fn()
})

const submittedValues = (): EventFormValues =>
  vi.mocked(prepareUpdateData).mock.calls[0][0].values

describe('handleUpdateSubmit - weekly series on chosen weekdays (#1581)', () => {
  beforeEach(() => vi.clearAllMocks())

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
