import { defaultSearchParams } from '@common/features/Search/SearchSlice'
import SearchResultsPage from '@common/features/Search/SearchResultsPage'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

describe('SearchResultsPage', () => {
  const today = new Date()
  const start = new Date(today)
  start.setHours(10, 0, 0, 0)
  const end = new Date(today)
  end.setHours(11, 0, 0, 0)
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
          events: {
            event1: {
              id: 'event1',
              calId: 'user1/cal1',
              uid: 'event1',
              title: 'Test Event',
              start: start.toISOString(),
              end: end.toISOString(),
              partstat: 'ACCEPTED',
              organizer: {
                cn: 'Alice',
                cal_address: 'alice@example.com'
              },
              attendee: [
                {
                  cn: 'Alice',
                  partstat: 'ACCEPTED',
                  rsvp: 'TRUE',
                  role: 'REQ-PARTICIPANT',
                  cutype: 'INDIVIDUAL',
                  cal_address: 'alice@example.com'
                }
              ]
            }
          }
        },
        'user2/cal1': {
          name: 'Calendar delegated',
          delegated: true,
          id: 'user2/cal1',
          color: { light: '#FF0000', dark: '#000' },
          owner: { emails: ['alice@example.com'] },
          events: {
            event1: {
              id: 'event1',
              calId: 'user2/cal1',
              uid: 'event1',
              title: 'Test Event',
              start: start.toISOString(),
              end: end.toISOString(),
              partstat: 'ACCEPTED',
              organizer: {
                cn: 'Alice',
                cal_address: 'alice@example.com'
              },
              attendee: [
                {
                  cn: 'Alice',
                  partstat: 'ACCEPTED',
                  rsvp: 'TRUE',
                  role: 'REQ-PARTICIPANT',
                  cutype: 'INDIVIDUAL',
                  cal_address: 'alice@example.com'
                }
              ]
            }
          }
        },
        'user3/cal1': {
          name: 'Calendar shared',
          id: 'user3/cal1',
          color: { light: '#FF0000', dark: '#000' },
          owner: { emails: ['alice@example.com'] },
          events: {
            event1: {
              id: 'event1',
              calId: 'user3/cal1',
              uid: 'event1',
              title: 'Test Event',
              start: start.toISOString(),
              end: end.toISOString(),
              partstat: 'ACCEPTED',
              organizer: {
                cn: 'Alice',
                cal_address: 'alice@example.com'
              },
              attendee: [
                {
                  cn: 'Alice',
                  partstat: 'ACCEPTED',
                  rsvp: 'TRUE',
                  role: 'REQ-PARTICIPANT',
                  cutype: 'INDIVIDUAL',
                  cal_address: 'alice@example.com'
                }
              ]
            }
          }
        }
      },
      pending: false
    }
  }

  it('should show loading spinner when loading', () => {
    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        searchParams: defaultSearchParams,
        loading: true,
        error: null,
        hits: 0,
        results: []
      }
    })
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should show error message when error occurs', () => {
    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        searchParams: defaultSearchParams,
        loading: false,
        error: 'Network error',
        hits: 0,
        results: []
      }
    })
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('should show no results message when no hits', () => {
    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        searchParams: defaultSearchParams,
        loading: false,
        error: null,
        hits: null,
        results: []
      }
    })
    expect(
      screen.getByText('search.noResults', { ignore: '[role="status"]' })
    ).toBeInTheDocument()
  })

  it('announces that nothing was found, once (#1789)', () => {
    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        searchParams: defaultSearchParams,
        loading: false,
        error: null,
        hits: 0,
        results: []
      }
    })

    expect(screen.getByRole('status')).toHaveTextContent('search.noResults')
    // The illustration does not repeat the message
    expect(screen.queryByRole('img', { name: 'search.noResults' })).toBeNull()
  })

  it('announces nothing while searching (#1789)', () => {
    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        searchParams: defaultSearchParams,
        loading: true,
        error: null,
        hits: 0,
        results: []
      }
    })

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('should render search results', () => {
    const mockResults = [
      {
        data: {
          uid: '1',
          summary: 'Team Meeting',
          start: '2025-06-26T15:00:00Z',
          organizer: { cn: 'John Doe', email: 'john@example.com' },
          allDay: false
        }
      },
      {
        data: {
          uid: '2',
          summary: 'Project Review',
          start: '2025-06-27T10:00:00Z',
          organizer: { cn: 'Jane Smith', email: 'jane@example.com' },
          allDay: false
        }
      }
    ]

    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        searchParams: defaultSearchParams,
        results: mockResults,
        hits: 2
      }
    })
    expect(screen.getByText('search.resultsTitle')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'search.resultsCount(smart_count=2)'
    )
    expect(screen.getByText('Team Meeting')).toBeInTheDocument()
    expect(screen.getByText('Project Review')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('shows the keyword and total hits rather than the loaded result count', () => {
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

  it('includes the year for a result outside the current year', () => {
    const start = `${new Date().getUTCFullYear() + 1}-03-12T10:00:00Z`
    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        searchParams: defaultSearchParams,
        results: [{ data: { uid: 'future', summary: 'Future', start } }],
        hits: 1
      }
    })
    expect(screen.getByText(formatDay(start))).toBeInTheDocument()
  })

  it('should handle events without organizer', () => {
    const mockResults = [
      {
        data: {
          uid: '1',
          summary: 'Untitled Event',
          start: '2025-06-26T15:00:00Z',
          allDay: false
        }
      }
    ]

    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        searchParams: defaultSearchParams,
        results: mockResults,
        hits: 1
      }
    })

    expect(screen.getByText('Untitled Event')).toBeInTheDocument()
  })

  it('should format all-day events correctly', () => {
    const mockResults = [
      {
        data: {
          uid: '1',
          summary: 'All Day Event',
          start: '2025-06-26T00:00:00Z',
          organizer: { cn: 'Organizer' },
          allDay: true
        }
      }
    ]

    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        searchParams: defaultSearchParams,
        results: mockResults,
        hits: 1
      }
    })

    expect(screen.getByText('All Day Event')).toBeInTheDocument()
  })

  const formatDay = (iso: string): string =>
    new Date(iso).toLocaleDateString('en', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      ...(new Date(iso).getUTCFullYear() !== new Date().getUTCFullYear()
        ? ({ year: 'numeric' } as const)
        : {}),
      timeZone: 'UTC'
    })

  it('should display a one-day all-day event on its single day', () => {
    const mockResults = [
      {
        data: {
          uid: '1',
          summary: 'One Day Event',
          start: '2026-10-14T00:00:00Z',
          end: '2026-10-15T00:00:00Z',
          allDay: true
        }
      }
    ]

    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        searchParams: defaultSearchParams,
        results: mockResults,
        hits: 1
      }
    })

    expect(
      screen.getByText(formatDay('2026-10-14T00:00:00Z'))
    ).toBeInTheDocument()
    expect(
      screen.queryByText(formatDay('2026-10-15T00:00:00Z'), { exact: false })
    ).not.toBeInTheDocument()
  })

  it('should display the last day of a multi-day all-day event', () => {
    const mockResults = [
      {
        data: {
          uid: '1',
          summary: 'Ongoing',
          start: '2026-10-04T00:00:00Z',
          end: '2026-10-09T00:00:00Z',
          allDay: true
        }
      }
    ]

    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        searchParams: defaultSearchParams,
        results: mockResults,
        hits: 1
      }
    })

    expect(
      screen.getByText(
        `${formatDay('2026-10-04T00:00:00Z')} - ${formatDay('2026-10-08T00:00:00Z')}`
      )
    ).toBeInTheDocument()
  })

  it('shows an all-day result on its day for a user west of UTC (#1760)', () => {
    const mockResults = [
      {
        data: {
          uid: '1',
          summary: 'New York day off',
          start: '2026-10-27T00:00:00Z',
          end: '2026-10-28T00:00:00Z',
          allDay: true
        }
      }
    ]

    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      settings: { timeZone: 'America/New_York' },
      searchResult: {
        searchParams: defaultSearchParams,
        results: mockResults,
        hits: 1
      }
    })

    expect(
      screen.getByText(formatDay('2026-10-27T00:00:00Z'))
    ).toBeInTheDocument()
    expect(
      screen.queryByText(formatDay('2026-10-26T00:00:00Z'), { exact: false })
    ).not.toBeInTheDocument()
  })
})
