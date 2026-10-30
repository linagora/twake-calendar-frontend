import SearchResultsPage from '@common/features/Search/SearchResultsPage'
import { defaultSearchParams } from '@common/features/Search/SearchSlice'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

jest.mock('@common/useScreenSizeDetection', () => ({
  useScreenSizeDetection: (): { isTooSmall: boolean; isTablet: boolean } => ({
    isTooSmall: true,
    isTablet: false
  })
}))

describe('SearchResultsPage on mobile', () => {
  const preloadedState = {
    user: {
      userData: {
        sub: 'test',
        email: 'test@test.com',
        sid: 'mockSid',
        openpaasId: 'user1'
      },
      tokens: { accessToken: 'token' }
    },
    calendars: {
      list: {
        'user1/cal1': {
          name: 'Calendar personal',
          id: 'user1/cal1',
          color: { light: '#FF0000', dark: '#000' },
          owner: { emails: ['alice@example.com'] },
          events: {}
        }
      },
      pending: false
    }
  }

  const currentYear = new Date().getUTCFullYear()

  const formatDay = (iso: string): string =>
    new Date(iso).toLocaleDateString('en', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC'
    })

  const formatTime = (iso: string): string =>
    new Date(iso).toLocaleTimeString('en', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    })

  const renderResult = (
    data: Record<string, unknown>,
    timeZone?: string
  ): void => {
    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      ...(timeZone ? { settings: { timeZone } } : {}),
      searchResult: {
        searchParams: defaultSearchParams,
        error: null,
        loading: false,
        results: [
          {
            data: {
              uid: 'event1',
              userId: 'user1',
              calendarId: 'cal1',
              ...data
            }
          }
        ],
        hits: 1
      }
    })
  }

  it('shares the keyword header and uses total hits', () => {
    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        searchParams: { ...defaultSearchParams, search: 'sprint' },
        loading: false,
        error: null,
        results: [],
        hits: 42
      }
    })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'search.resultsFor(smart_count=42,keyword=sprint)'
    )
  })

  it('should display the month of the result', () => {
    renderResult({
      summary: 'alpha batch',
      start: `${currentYear}-12-07T03:00:00Z`,
      end: `${currentYear}-12-07T04:00:00Z`,
      allDay: false
    })

    expect(screen.getByText('07')).toBeInTheDocument()
    expect(screen.getByText('DEC')).toBeInTheDocument()
    expect(screen.queryByText(`${currentYear}`)).not.toBeInTheDocument()
  })

  it('should display the year of a result outside the current year', () => {
    renderResult({
      summary: 'next year',
      start: `${currentYear + 1}-03-10T03:00:00Z`,
      end: `${currentYear + 1}-03-10T04:00:00Z`,
      allDay: false
    })

    expect(screen.getByText('MAR')).toBeInTheDocument()
    expect(screen.getByText(`${currentYear + 1}`)).toBeInTheDocument()
  })

  it('should display the start and end time of a timed result', () => {
    renderResult({
      summary: 'alpha batch',
      start: `${currentYear}-12-07T03:00:00Z`,
      end: `${currentYear}-12-07T04:00:00Z`,
      allDay: false
    })

    expect(
      within(screen.getByTestId('event-card-event1')).getByText(
        `${formatTime(`${currentYear}-12-07T03:00:00Z`)} - ${formatTime(`${currentYear}-12-07T04:00:00Z`)}`
      )
    ).toBeInTheDocument()
  })

  it('should display the last day of a multi-day all-day result', () => {
    renderResult({
      summary: 'Lastday span',
      start: `${currentYear}-11-04T00:00:00Z`,
      end: `${currentYear}-11-09T00:00:00Z`,
      allDay: true
    })

    expect(
      screen.getByText(
        `${formatDay(`${currentYear}-11-04T00:00:00Z`)} - ${formatDay(`${currentYear}-11-08T00:00:00Z`)}`
      )
    ).toBeInTheDocument()
  })

  it('should not display a span for a single-day all-day result', () => {
    renderResult({
      summary: 'Lastday one',
      start: `${currentYear}-10-14T00:00:00Z`,
      end: `${currentYear}-10-15T00:00:00Z`,
      allDay: true
    })

    expect(
      within(screen.getByTestId('event-card-event1')).queryByText(/Oct/)
    ).not.toBeInTheDocument()
  })

  it('should display the end day and time of a multi-day timed result', () => {
    renderResult({
      summary: 'Lastday timed',
      start: `${currentYear}-10-20T18:00:00Z`,
      end: `${currentYear}-10-21T09:00:00Z`,
      allDay: false
    })

    const start = `${currentYear}-10-20T18:00:00Z`
    const end = `${currentYear}-10-21T09:00:00Z`
    expect(
      screen.getByText(
        `${formatDay(start)} ${formatTime(start)} - ${formatDay(end)} ${formatTime(end)}`
      )
    ).toBeInTheDocument()
  })

  it('shows the days of an all-day result for a user west of UTC (#1760)', () => {
    renderResult(
      {
        summary: 'New York span',
        start: `${currentYear}-11-04T00:00:00Z`,
        end: `${currentYear}-11-09T00:00:00Z`,
        allDay: true
      },
      'America/New_York'
    )

    // the date column, then the span of the card
    expect(screen.getByText('04')).toBeInTheDocument()
    expect(screen.queryByText('03')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        `${formatDay(`${currentYear}-11-04T00:00:00Z`)} - ${formatDay(`${currentYear}-11-08T00:00:00Z`)}`
      )
    ).toBeInTheDocument()
  })
})
