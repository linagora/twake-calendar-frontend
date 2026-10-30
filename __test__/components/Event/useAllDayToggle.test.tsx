import type { Mock } from 'vitest'
import {
  AllDayToggleParams,
  toInclusiveAllDayEnd,
  useAllDayToggle
} from '@common/components/Event/hooks/useAllDayToggle'
import { act, renderHook } from '@testing-library/react'

const PARIS = 'Europe/Paris'
const TONGATAPU = 'Pacific/Tongatapu'

function untickAllDay(overrides: Partial<AllDayToggleParams> = {}): Mock {
  const onAllDayChange = vi.fn()
  const { result } = renderHook(() =>
    useAllDayToggle({
      allday: true,
      start: '2026-10-10',
      end: '2026-10-10',
      startDate: '2026-10-10',
      startTime: '',
      endDate: '2026-10-10',
      endTime: '',
      timezone: PARIS,
      setStartTime: vi.fn(),
      setEndTime: vi.fn(),
      setStart: vi.fn(),
      setEnd: vi.fn(),
      setAllDay: vi.fn(),
      onAllDayChange,
      ...overrides
    })
  )

  result.current.handleAllDayToggle()
  return onAllDayChange
}

describe('useAllDayToggle (#1514)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('moves the end to the next day when the proposed slot crosses midnight', () => {
    // 22:30 in Paris
    vi.useFakeTimers().setSystemTime(new Date('2026-10-05T20:30:00Z'))

    const onAllDayChange = untickAllDay()

    expect(onAllDayChange).toHaveBeenCalledWith(
      false,
      '2026-10-10T23:00',
      '2026-10-11T00:00'
    )
  })

  it('keeps the event day when the proposed slot does not cross midnight', () => {
    // 14:30 in Paris
    vi.useFakeTimers().setSystemTime(new Date('2026-10-05T12:30:00Z'))

    const onAllDayChange = untickAllDay()

    expect(onAllDayChange).toHaveBeenCalledWith(
      false,
      '2026-10-10T15:00',
      '2026-10-10T16:00'
    )
  })

  it('keeps the last day of a multi-day event when the slot crosses midnight', () => {
    // 22:30 in Paris
    vi.useFakeTimers().setSystemTime(new Date('2026-10-05T20:30:00Z'))

    const onAllDayChange = untickAllDay({
      end: '2026-10-12',
      endDate: '2026-10-12'
    })

    expect(onAllDayChange).toHaveBeenCalledWith(
      false,
      '2026-10-10T23:00',
      '2026-10-12T00:00'
    )
  })

  it('proposes the next round hour in the zone of the event, not in the one of the browser', () => {
    // 09:30 in Tongatapu (UTC+13)
    vi.useFakeTimers().setSystemTime(new Date('2026-10-05T20:30:00Z'))

    const onAllDayChange = untickAllDay({ timezone: TONGATAPU })

    expect(onAllDayChange).toHaveBeenCalledWith(
      false,
      '2026-10-10T10:00',
      '2026-10-10T11:00'
    )
  })
})

function renderToggle(
  allday: boolean,
  start: string,
  end: string
): {
  result: { current: ReturnType<typeof useAllDayToggle> }
  rerender: (props: { allday: boolean; start: string; end: string }) => void
  onAllDayChange: Mock
} {
  const onAllDayChange = vi.fn()
  const { result, rerender } = renderHook(
    props =>
      useAllDayToggle({
        ...props,
        startDate: props.start.split('T')[0],
        startTime: props.start.split('T')[1] ?? '',
        endDate: props.end.split('T')[0],
        endTime: props.end.split('T')[1] ?? '',
        setStartTime: vi.fn(),
        setEndTime: vi.fn(),
        setStart: vi.fn(),
        setEnd: vi.fn(),
        setAllDay: vi.fn(),
        onAllDayChange
      }),
    { initialProps: { allday, start, end } }
  )
  return { result, rerender, onAllDayChange }
}

describe('toInclusiveAllDayEnd', () => {
  it('moves a midnight end back to the previous day', () => {
    expect(toInclusiveAllDayEnd('2026-10-07T22:00', '2026-10-08T00:00')).toBe(
      '2026-10-07T00:00'
    )
  })

  it('keeps the last day of a multi-day event ending at midnight', () => {
    expect(toInclusiveAllDayEnd('2026-10-05T23:00', '2026-10-08T00:00')).toBe(
      '2026-10-07T00:00'
    )
  })

  it('keeps an end that is not at midnight', () => {
    expect(toInclusiveAllDayEnd('2026-10-07T10:00', '2026-10-07T11:00')).toBe(
      '2026-10-07T11:00'
    )
  })

  it('moves a midnight end carrying seconds back to the previous day', () => {
    expect(
      toInclusiveAllDayEnd('2026-10-07T22:00', '2026-10-08T00:00:00')
    ).toBe('2026-10-07T00:00')
  })

  it('keeps an end a few seconds after midnight', () => {
    expect(
      toInclusiveAllDayEnd('2026-10-07T22:00', '2026-10-08T00:00:30')
    ).toBe('2026-10-08T00:00:30')
  })

  it('never moves the end before the start', () => {
    expect(toInclusiveAllDayEnd('2026-10-07T00:00', '2026-10-07T00:00')).toBe(
      '2026-10-07T00:00'
    )
  })
})

describe('useAllDayToggle (#1511)', () => {
  it.each([
    [
      'an event ending at midnight keeps a single day',
      '2026-10-07T22:00',
      '2026-10-08T00:00',
      '2026-10-07T00:00'
    ],
    [
      'a daytime event keeps its end',
      '2026-10-07T10:00',
      '2026-10-07T11:00',
      '2026-10-07T11:00'
    ]
  ])('ticking all day on %s', (_, start, end, expectedEnd) => {
    const { result, onAllDayChange } = renderToggle(false, start, end)

    act(() => result.current.handleAllDayToggle())

    expect(onAllDayChange).toHaveBeenCalledWith(true, start, expectedEnd)
  })

  it('unticking all day right away restores the midnight end', () => {
    const { result, rerender, onAllDayChange } = renderToggle(
      false,
      '2026-10-07T22:00',
      '2026-10-08T00:00'
    )
    act(() => result.current.handleAllDayToggle())
    rerender({
      allday: true,
      start: '2026-10-07T22:00',
      end: '2026-10-07T00:00'
    })

    act(() => result.current.handleAllDayToggle())

    expect(onAllDayChange).toHaveBeenLastCalledWith(
      false,
      '2026-10-07T22:00',
      '2026-10-08T00:00'
    )
  })
})
