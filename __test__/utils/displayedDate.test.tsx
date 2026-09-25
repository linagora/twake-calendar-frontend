import {
  getDisplayedDate,
  setDisplayedDate
} from '@common/utils/storage/displayedDate'

describe('displayedDate storage', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-23T10:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('defaults to now when nothing was displayed yet', () => {
    expect(getDisplayedDate()).toEqual(new Date('2026-09-23T10:00:00Z'))
  })

  it('restores the last displayed date', () => {
    setDisplayedDate(new Date('2026-10-07T00:00:00Z'))

    expect(getDisplayedDate()).toEqual(new Date('2026-10-07T00:00:00Z'))
  })

  it('falls back to now when the stored value is garbage', () => {
    sessionStorage.setItem('displayedDate', 'not a date')

    expect(getDisplayedDate()).toEqual(new Date('2026-09-23T10:00:00Z'))
  })

  it('falls back to now when the stored date is in the past', () => {
    setDisplayedDate(new Date('2026-09-16T10:00:00Z'))

    expect(getDisplayedDate()).toEqual(new Date('2026-09-23T10:00:00Z'))
  })
})
