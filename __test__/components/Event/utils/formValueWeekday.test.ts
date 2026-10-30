import { formValueWeekday } from '@common/components/Event/utils/formValueWeekday'
import { mockBrowserWestOfUtc } from '../../../utils/browserWestOfUtc'

describe('formValueWeekday', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // 2026-11-16 is a Monday
  it('reads the date of an all-day value', () => {
    expect(formValueWeekday('2026-11-16')).toBe('MO')
  })

  it('reads the date of an all-day value as a calendar date west of UTC', () => {
    mockBrowserWestOfUtc()

    expect(formValueWeekday('2026-11-16')).toBe('MO')
  })

  it('reads the date of a timed value', () => {
    expect(formValueWeekday('2026-11-16T23:30')).toBe('MO')
  })

  it('returns null for a value it cannot read', () => {
    expect(formValueWeekday('')).toBeNull()
    expect(formValueWeekday('not a date')).toBeNull()
  })
})
