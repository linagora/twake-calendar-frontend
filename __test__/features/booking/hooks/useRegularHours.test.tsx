import { renderHook, act } from '@testing-library/react'
import { useRegularHours } from '../../../../apps/private/src/features/booking/hooks/useRegularHours'
import { DayAvailability } from '../../../../apps/private/src/features/booking/components/RegularHoursField/RegularHoursTypes'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string, options: any) => options?.defaultValue || key
  })
}))

describe('useRegularHours', () => {
  const createMockRule = (
    slots: { start: string; end: string }[]
  ): DayAvailability[] => [{ dayOfWeek: 'MON', enabled: true, slots }]

  const setup = (
    initialRules: DayAvailability[] = [],
    workingDays: number[] = [1, 2, 3, 4, 5]
  ) => {
    let rules: DayAvailability[] = [...initialRules]
    const setRules = jest.fn(cb => {
      rules = typeof cb === 'function' ? cb(rules) : cb
    })

    const hook = renderHook(() =>
      useRegularHours({
        availabilityRules: rules,
        setAvailabilityRules: setRules,
        workingDays
      })
    )

    return {
      getRules: () => rules,
      ...hook
    }
  }

  const expectSingleRuleForDay = (rules: DayAvailability[], day: string) => {
    expect(rules).toHaveLength(1)
    expect(rules[0].dayOfWeek).toBe(day)
    return rules[0]
  }

  it('toggles day on/off', () => {
    const { result, getRules } = setup()

    act(() => {
      result.current.handleToggleDay('MON')
    })

    // First time should add MON and since it's a default working day, it toggles from true to false
    const rule = expectSingleRuleForDay(getRules(), 'MON')
    expect(rule.enabled).toBe(false)

    act(() => {
      result.current.handleToggleDay('MON')
    })

    // Second time should toggle to true
    expect(getRules()[0].enabled).toBe(true)
  })

  it('adds a slot', () => {
    const { result, getRules } = setup(
      createMockRule([{ start: '09:00', end: '12:00' }])
    )

    act(() => {
      result.current.handleAddSlot('MON')
    })

    expect(getRules()[0].slots).toHaveLength(2)
  })

  it('adds a slot to a new day when no rule exists', () => {
    const { result, getRules } = setup()
    act(() => {
      result.current.handleAddSlot('TUE')
    })
    const rule = expectSingleRuleForDay(getRules(), 'TUE')
    expect(rule.slots).toHaveLength(2)
  })

  it('removes a slot', () => {
    const { result, getRules } = setup(
      createMockRule([
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '18:00' }
      ])
    )

    act(() => {
      result.current.handleRemoveSlot('MON', 0)
    })

    expect(getRules()[0].slots).toHaveLength(1)
    expect(getRules()[0].slots[0].start).toBe('14:00')
  })

  it('changes a time slot', () => {
    const { result, getRules } = setup(
      createMockRule([{ start: '09:00', end: '12:00' }])
    )

    act(() => {
      result.current.handleTimeChange('MON', 0, 'start', '10:00')
    })

    expect(getRules()[0].slots[0].start).toBe('10:00')
  })

  it('keeps the entered value even if start >= end so that it can be reported', () => {
    const { result, getRules } = setup(
      createMockRule([{ start: '09:00', end: '18:00' }])
    )

    act(() => {
      result.current.handleTimeChange('MON', 0, 'end', '08:00')
    })

    expect(getRules()[0].slots[0]).toEqual({ start: '09:00', end: '08:00' })
  })

  it('changes a time slot for a day with no existing rules', () => {
    const { result, getRules } = setup()

    act(() => {
      result.current.handleTimeChange('TUE', 0, 'start', '08:00')
    })

    const rule = expectSingleRuleForDay(getRules(), 'TUE')
    expect(rule.slots[0].start).toBe('08:00')
  })

  it('copies slots to all days, keeping disabled state for non-working days', () => {
    const { result, getRules } = setup(
      createMockRule([{ start: '10:00', end: '11:00' }]),
      [1, 2] // MON and TUE
    )

    act(() => {
      result.current.handleCopySlot('MON', 0)
    })

    const rules = getRules()
    // TUE should be added and enabled (working day)
    const tue = rules.find(r => r.dayOfWeek === 'TUE')
    expect(tue).toBeDefined()
    expect(tue?.enabled).toBe(true)
    expect(tue?.slots[0].start).toBe('10:00')
    expect(tue?.slots[0].end).toBe('11:00')

    // WED should be added but disabled (non-working day)
    const wed = rules.find(r => r.dayOfWeek === 'WED')
    expect(wed).toBeDefined()
    expect(wed?.enabled).toBe(false)
    expect(wed?.slots[0].start).toBe('10:00')
    expect(wed?.slots[0].end).toBe('11:00')
  })

  it('copies slots to another working day with fewer existing slots', () => {
    const { result, getRules } = setup(
      [
        {
          dayOfWeek: 'MON',
          enabled: true,
          slots: [
            { start: '09:00', end: '10:00' },
            { start: '10:00', end: '11:00' },
            { start: '11:00', end: '12:00' }
          ]
        },
        {
          dayOfWeek: 'TUE',
          enabled: true,
          slots: [{ start: '08:00', end: '09:00' }]
        }
      ],
      [1, 2] // MON and TUE
    )

    act(() => {
      result.current.handleCopySlot('MON', 2)
    })

    const rules = getRules()
    const tue = rules.find(r => r.dayOfWeek === 'TUE')
    expect(tue).toBeDefined()
    expect(tue?.slots).toHaveLength(3)
    expect(tue?.slots[2].start).toBe('11:00')
  })

  it('gets correct day label', () => {
    const { result } = setup()

    expect(result.current.getDayLabel('MON')).toBe('booking.days.MON')
  })
})
