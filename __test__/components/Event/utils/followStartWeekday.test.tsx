import { followStartWeekday } from '@common/components/Event/utils/followStartWeekday'
import { useEventFormValues } from '@common/components/Event/hooks/useEventFormValues'
import { RepetitionObject } from '@common/types/Repetition'
import { act, renderHook } from '@testing-library/react'

// 2026-10-17 is a Saturday, 2026-11-02 a Monday
const SATURDAY = '2026-10-17T16:00'
const MONDAY = '2026-11-02T10:00'

const weekly = (byday: string[] | null): RepetitionObject =>
  new RepetitionObject({ freq: 'weekly', interval: 1, byday })

describe('followStartWeekday', () => {
  it('moves the proposed weekday to the weekday of the new start', () => {
    expect(followStartWeekday(weekly(['SA']), SATURDAY, MONDAY).byday).toEqual([
      'MO'
    ])
  })

  it('keeps the other fields of the repetition', () => {
    const repetition = new RepetitionObject({
      freq: 'weekly',
      interval: 2,
      byday: ['SA'],
      occurrences: 2
    })

    expect(followStartWeekday(repetition, SATURDAY, MONDAY)).toMatchObject({
      freq: 'weekly',
      interval: 2,
      byday: ['MO'],
      occurrences: 2
    })
  })

  it('keeps several picked days', () => {
    const repetition = weekly(['SA', 'TU'])

    expect(followStartWeekday(repetition, SATURDAY, MONDAY)).toBe(repetition)
  })

  it('keeps a single day picked apart from the start', () => {
    const repetition = weekly(['WE'])

    expect(followStartWeekday(repetition, SATURDAY, MONDAY)).toBe(repetition)
  })

  it('leaves other frequencies alone', () => {
    const repetition = new RepetitionObject({ freq: 'daily', interval: 1 })

    expect(followStartWeekday(repetition, SATURDAY, MONDAY)).toBe(repetition)
  })

  it('leaves the repetition alone when a start cannot be read', () => {
    const repetition = weekly(['SA'])

    expect(followStartWeekday(repetition, SATURDAY, '')).toBe(repetition)
  })
})

describe('useEventFormValues setStart', () => {
  it('saves a weekly series on the weekday of the start picked afterwards', () => {
    const { result } = renderHook(() =>
      useEventFormValues({
        initialValues: { start: SATURDAY, end: '2026-10-17T17:00' },
        isOpen: true,
        tempStorageKey: 'create'
      })
    )

    act(() => result.current.setRepetition(weekly(['SA'])))
    act(() => result.current.setStart(MONDAY))

    expect(result.current.formValues.start).toBe(MONDAY)
    expect(result.current.formValues.repetition.byday).toEqual(['MO'])
  })
})
