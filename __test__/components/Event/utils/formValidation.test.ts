import {
  isDateInPast,
  validateEventForm,
  ValidationParams
} from '@/components/Event/utils/formValidation'

const FROZEN_TODAY = '2025-06-15'
const YESTERDAY = '2025-06-14'
const TOMORROW = '2025-06-16'
const TODAY = FROZEN_TODAY

const baseParams = (
  overrides: Partial<ValidationParams> = {}
): ValidationParams => ({
  startDate: TOMORROW,
  startTime: '10:00',
  endDate: TOMORROW,
  endTime: '11:00',
  allday: false,
  hasEndDateChanged: false,
  showMore: false,
  ...overrides
})

const FROZEN_DATE = new Date(2025, 5, 15) // 15 Jun 2025, local midnight

describe('isDateInPast', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FROZEN_DATE)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns false for an empty string', () => {
    expect(isDateInPast('')).toBe(false)
  })

  it('returns false for today', () => {
    expect(isDateInPast(TODAY)).toBe(false)
  })

  it('returns false for a future date', () => {
    expect(isDateInPast(TOMORROW)).toBe(false)
  })

  it('returns true for yesterday', () => {
    expect(isDateInPast(YESTERDAY)).toBe(true)
  })

  it('returns true for a date far in the past', () => {
    expect(isDateInPast('2020-01-01')).toBe(true)
  })

  it('returns false for an invalid date string', () => {
    // NaN check — should not throw and should return false
    expect(isDateInPast('not-a-date')).toBe(false)
  })
})

describe('validateEventForm — start date', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FROZEN_DATE)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('is invalid when startDate is empty', () => {
    const result = validateEventForm(baseParams({ startDate: '' }))
    expect(result.isValid).toBe(false)
    expect(result.errors.date.start).toBe('event.validation.startRequired')
  })

  it('has warning when startDate is in the past', () => {
    const result = validateEventForm(
      baseParams({ startDate: YESTERDAY, endDate: YESTERDAY })
    )
    expect(result.isValid).toBe(true)
    expect(result.warnings.date.start).toBe('event.validation.startDateInPast')
  })

  it('is valid when startDate is today', () => {
    const result = validateEventForm(
      baseParams({
        startDate: TODAY,
        endDate: TODAY,
        startTime: '09:00',
        endTime: '10:00'
      })
    )
    expect(result.isValid).toBe(true)
    expect(result.errors.date.start).toBe('')
  })

  it('is valid when startDate is in the future', () => {
    const result = validateEventForm(baseParams())
    expect(result.isValid).toBe(true)
    expect(result.errors.date.start).toBe('')
  })
})

describe('validateEventForm — start time', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FROZEN_DATE)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('is invalid when startTime is empty and not all-day', () => {
    const result = validateEventForm(baseParams({ startTime: '' }))
    expect(result.isValid).toBe(false)
    expect(result.errors.time.start).toBe('event.validation.startRequired')
  })

  it('is valid when startTime is empty but event is all-day', () => {
    const result = validateEventForm(
      baseParams({
        startTime: '',
        endTime: '',
        allday: true,
        showMore: true, // forces 4-field mode so endDate is validated
        endDate: TOMORROW
      })
    )
    expect(result.isValid).toBe(true)
  })
})

describe('validateEventForm — compact layout (same-day, showMore=false)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FROZEN_DATE)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // In compact mode: showMore=false, allday=false, startDate === endDate → showTimeOnly=true
  const compactParams = (overrides: Partial<ValidationParams> = {}) =>
    baseParams({
      startDate: TOMORROW,
      endDate: TOMORROW,
      startTime: '10:00',
      endTime: '11:00',
      showMore: false,
      hasEndDateChanged: false,
      ...overrides
    })

  it('is invalid when endTime is empty', () => {
    const result = validateEventForm(compactParams({ endTime: '' }))
    expect(result.isValid).toBe(false)
    expect(result.errors.time.end).toBe('event.validation.endRequired')
  })

  it('is invalid when endTime equals startTime', () => {
    const result = validateEventForm(
      compactParams({ startTime: '10:00', endTime: '10:00' })
    )
    expect(result.isValid).toBe(false)
    expect(result.errors.time.end).toBe('event.validation.endAfterStart')
  })

  it('is invalid when endTime is before startTime', () => {
    const result = validateEventForm(
      compactParams({ startTime: '14:00', endTime: '09:00' })
    )
    expect(result.isValid).toBe(false)
    expect(result.errors.time.end).toBe('event.validation.endAfterStart')
  })

  it('is valid when endTime is after startTime', () => {
    const result = validateEventForm(
      compactParams({ startTime: '09:00', endTime: '10:00' })
    )
    expect(result.isValid).toBe(true)
    expect(result.errors.time.end).toBe('')
  })

  it('is invalid for malformed time strings', () => {
    const result = validateEventForm(
      compactParams({ startTime: 'bad', endTime: 'also-bad' })
    )
    expect(result.isValid).toBe(false)
    expect(result.errors.time.end).toBe('event.validation.invalidTimeFormat')
    expect(result.errors.time.start).toBe('event.validation.invalidTimeFormat')
  })
})

describe('validateEventForm — expanded layout (showMore=true)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FROZEN_DATE)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const expandedParams = (overrides: Partial<ValidationParams> = {}) =>
    baseParams({ showMore: true, ...overrides })

  it('is invalid when endDate is empty', () => {
    const result = validateEventForm(expandedParams({ endDate: '' }))
    expect(result.isValid).toBe(false)
    expect(result.errors.time.end).toBe('event.validation.endRequired')
  })

  it('is invalid when endTime is empty (non-all-day)', () => {
    const result = validateEventForm(expandedParams({ endTime: '' }))
    expect(result.isValid).toBe(false)
    expect(result.errors.time.end).toBe('event.validation.endRequired')
  })

  it('is invalid when end datetime equals start datetime', () => {
    const result = validateEventForm(
      expandedParams({
        startTime: '10:00',
        endTime: '10:00',
        endDate: TOMORROW
      })
    )
    expect(result.isValid).toBe(false)
    expect(result.errors.time.end).toBe('event.validation.endAfterStart')
  })

  it('is invalid when end datetime is before start datetime', () => {
    const result = validateEventForm(
      expandedParams({
        startDate: TOMORROW,
        startTime: '14:00',
        endDate: TOMORROW,
        endTime: '09:00'
      })
    )
    expect(result.isValid).toBe(false)
    expect(result.errors.time.end).toBe('event.validation.endAfterStart')
  })

  it('is valid when end datetime is after start datetime', () => {
    const result = validateEventForm(
      expandedParams({
        startDate: TOMORROW,
        startTime: '09:00',
        endDate: TOMORROW,
        endTime: '10:00'
      })
    )
    expect(result.isValid).toBe(true)
  })

  it('is valid when end date is after start date regardless of time', () => {
    const result = validateEventForm(
      expandedParams({
        startDate: TOMORROW,
        startTime: '22:00',
        endDate: '2025-06-20',
        endTime: '08:00'
      })
    )
    expect(result.isValid).toBe(true)
  })
})

describe('validateEventForm — all-day events', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FROZEN_DATE)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const alldayParams = (overrides: Partial<ValidationParams> = {}) =>
    baseParams({
      allday: true,
      startTime: '',
      endTime: '',
      showMore: true,
      ...overrides
    })

  it('is invalid when endDate is before startDate', () => {
    const result = validateEventForm(
      alldayParams({ startDate: '2025-06-20', endDate: '2025-06-18' })
    )
    expect(result.isValid).toBe(false)
    expect(result.errors.date.end).toBe('event.validation.endAfterStart')
  })

  it('is valid when endDate equals startDate', () => {
    const result = validateEventForm(
      alldayParams({ startDate: TOMORROW, endDate: TOMORROW })
    )
    expect(result.isValid).toBe(true)
  })

  it('is valid when endDate is after startDate', () => {
    const result = validateEventForm(
      alldayParams({ startDate: TOMORROW, endDate: '2025-06-20' })
    )
    expect(result.isValid).toBe(true)
  })
})
