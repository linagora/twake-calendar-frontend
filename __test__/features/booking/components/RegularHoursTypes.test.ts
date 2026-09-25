import {
  hasInvalidSlot,
  isInvalidSlot
} from '../../../../apps/private/src/features/booking/components/RegularHoursField/RegularHoursTypes'

describe('RegularHoursTypes validation', () => {
  it('flags a slot ending before it starts', () => {
    expect(isInvalidSlot({ start: '09:00', end: '08:00' })).toBe(true)
  })

  it('flags a slot ending when it starts', () => {
    expect(isInvalidSlot({ start: '09:00', end: '09:00' })).toBe(true)
  })

  it('accepts a slot ending after it starts', () => {
    expect(isInvalidSlot({ start: '09:00', end: '18:00' })).toBe(false)
  })

  it('reports invalid slots of enabled days', () => {
    expect(
      hasInvalidSlot([
        {
          dayOfWeek: 'MON',
          enabled: true,
          slots: [{ start: '09:00', end: '08:00' }]
        }
      ])
    ).toBe(true)
  })

  it('ignores invalid slots of disabled days', () => {
    expect(
      hasInvalidSlot([
        {
          dayOfWeek: 'MON',
          enabled: false,
          slots: [{ start: '09:00', end: '08:00' }]
        },
        {
          dayOfWeek: 'TUE',
          enabled: true,
          slots: [{ start: '09:00', end: '18:00' }]
        }
      ])
    ).toBe(false)
  })
})
