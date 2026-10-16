import { shiftByday } from '@common/features/Events/utils/shiftByday'

describe('shiftByday', () => {
  it('moves the weekdays by the given number of days', () => {
    expect(shiftByday(['MO'], 1)).toEqual(['TU'])
    expect(shiftByday(['MO', 'WE', 'FR'], 2)).toEqual(['WE', 'FR', 'SU'])
  })

  it('wraps around the week, forward and backward', () => {
    expect(shiftByday(['SA'], 1)).toEqual(['SU'])
    expect(shiftByday(['MO'], -1)).toEqual(['SU'])
    expect(shiftByday(['TU'], -9)).toEqual(['SU'])
    expect(shiftByday(['MO'], 8)).toEqual(['TU'])
  })

  it('keeps the ordinal of the weekday', () => {
    expect(shiftByday(['1MO', '-1FR', '+2WE'], 1)).toEqual([
      '1TU',
      '-1SA',
      '+2TH'
    ])
  })

  it('leaves the rule untouched for whole weeks or no weekday', () => {
    const byday = ['MO']
    expect(shiftByday(byday, 0)).toBe(byday)
    expect(shiftByday(byday, 14)).toBe(byday)
    expect(shiftByday(null, 1)).toBeNull()
    expect(shiftByday(undefined, 1)).toBeUndefined()
    expect(shiftByday([], 1)).toEqual([])
  })
})
