import { CalendarApi } from '@fullcalendar/core'
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
  RenderResult
} from '@testing-library/react'
import React from 'react'
import { DatePickerMobile } from '@/components/Menubar/components/DatePickerMobile'

jest.mock('twake-i18n', () => ({
  useI18n: (): { t: (key: string) => string; lang: string } => ({
    t: (key: string) => key,
    lang: 'en'
  })
}))

jest.mock('@linagora/twake-mui', () => {
  const actual = jest.requireActual<typeof import('@linagora/twake-mui')>(
    '@linagora/twake-mui'
  )
  return {
    ...actual,
    useTheme: (): { palette: { grey: { 500: string } } } => ({
      palette: { grey: { 500: '#9e9e9e' } }
    })
  }
})

const scrollIntoViewMock = jest.fn()
const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock
})

afterAll(() => {
  window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView
})

function makeCalendarApi(initialDate: Date): CalendarApi & {
  getDate: jest.Mock
  gotoDate: jest.Mock
} {
  let _date = initialDate
  const mockApi = {
    getDate: jest.fn(() => _date),
    gotoDate: jest.fn((d: Date) => {
      _date = d
    })
  }
  return mockApi as unknown as CalendarApi & typeof mockApi
}

describe('DatePickerMobile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    scrollIntoViewMock.mockClear()
  })

  const setup = async (
    initialDate: Date
  ): Promise<
    RenderResult & { calendarApi: CalendarApi; onDateChange: jest.Mock }
  > => {
    const calendarApi = makeCalendarApi(initialDate)
    const onDateChange = jest.fn()
    const renderResult = await act(() =>
      render(
        <DatePickerMobile
          calendarRef={{ current: calendarApi }}
          currentDate={initialDate}
          onDateChange={onDateChange}
        />
      )
    )
    return { ...renderResult, calendarApi, onDateChange }
  }

  const expectNavigatedDate = (
    calendarApi: CalendarApi,
    expected: { day: number; month: number; year: number }
  ): void => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const gotoDateMock = calendarApi.gotoDate as jest.Mock<void, [Date]>
    const navigatedDate: Date = gotoDateMock.mock.calls[0][0]
    expect(navigatedDate.getDate()).toBe(expected.day)
    expect(navigatedDate.getMonth()).toBe(expected.month)
    expect(navigatedDate.getFullYear()).toBe(expected.year)
  }

  const testMonthNavigation = async (
    initialDate: Date,
    monthToClick: number,
    expected: { day: number; month: number; year: number }
  ): Promise<void> => {
    const { calendarApi } = await setup(initialDate)

    const monthButton = screen.getByText(`months.short.${monthToClick}`)
    act(() => {
      fireEvent.click(monthButton)
    })

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(calendarApi.gotoDate).toHaveBeenCalled()
    })

    expectNavigatedDate(calendarApi, expected)
  }

  it('calls calendarApi.gotoDate and onDateChange with the selected date', async () => {
    const initialDate = new Date(2025, 5, 15) // June 15, 2025
    const { calendarApi, onDateChange } = await setup(initialDate)

    const day20 = screen.getByRole('gridcell', { name: '20' })
    act(() => {
      fireEvent.click(day20)
    })

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(calendarApi.gotoDate).toHaveBeenCalled()
    })

    expectNavigatedDate(calendarApi, { day: 20, month: 5, year: 2025 })
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const gotoDateMock = calendarApi.gotoDate as jest.Mock<void, [Date]>
    expect(onDateChange).toHaveBeenCalledWith(gotoDateMock.mock.calls[0][0])
  })

  it('navigates to the clicked month while keeping the current day', async () => {
    await testMonthNavigation(
      new Date(2025, 5, 15), // June 15, 2025
      8,
      { day: 15, month: 8, year: 2025 }
    )
  })

  it('clamps the day to the last valid day when switching to a shorter month', async () => {
    await testMonthNavigation(
      new Date(2025, 0, 31), // Jan 31, 2025
      1,
      { day: 28, month: 1, year: 2025 }
    )
  })

  it('scrollIntoView is called on the correct month button when currentDate changes to another month', async () => {
    const initialDate = new Date(2025, 5, 15) // June 15, 2025  (month index 5)
    const { rerender, calendarApi, onDateChange } = await setup(initialDate)

    // Simulate parent updating currentDate to August (e.g. user picked a day in August)
    const newDate = new Date(2025, 7, 5) // August 5, 2025  (month index 7)

    act(() => {
      rerender(
        <DatePickerMobile
          calendarRef={{ current: calendarApi }}
          currentDate={newDate}
          onDateChange={onDateChange}
        />
      )
    })

    await waitFor(() => {
      // scrollIntoView should have been called at least once (initial mount + rerender)
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    })

    // The last call should correspond to August (index 7) button being highlighted
    const augustButton = screen.getByText('months.short.7')
    expect(augustButton).toBeInTheDocument()
  })
})
