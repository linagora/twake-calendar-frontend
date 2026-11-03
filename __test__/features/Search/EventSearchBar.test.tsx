import SearchBar from '@common/components/Menubar/EventSearchBar'
import * as searchThunk from '@common/features/Search/SearchSlice'
import { searchPeople } from '@common/features/User/UserDao'
import { SearchResponseItem } from '@common/types/SearchResponseItem'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../utils/Renderwithproviders'

vi.mock('@common/features/User/UserDao')
const mockedSearchPeople = searchPeople

describe('EventSearchBar', () => {
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

  it('should render search icon button initially', () => {
    renderWithProviders(<SearchBar />, preloadedState)

    const searchButton = screen.getByRole('button')
    expect(searchButton).toBeInTheDocument()
  })

  it('should expand search bar when icon is clicked', () => {
    renderWithProviders(<SearchBar />, preloadedState)

    const searchButton = screen.getByRole('button')
    fireEvent.click(searchButton)

    const searchInput = screen.getByPlaceholderText('common.search')
    expect(searchInput).toBeInTheDocument()
  })

  it('should unexpand search bar when field is unfocused and empty', () => {
    renderWithProviders(<SearchBar />, preloadedState)

    const searchButton = screen.getByRole('button')
    fireEvent.click(searchButton)

    const searchInput = screen.getByPlaceholderText('common.search')
    fireEvent.mouseDown(document.body)
    expect(searchInput).not.toBeInTheDocument()
  })

  it('should not unexpand search bar when field is unfocused but not empty', () => {
    renderWithProviders(<SearchBar />, preloadedState)

    const searchButton = screen.getByRole('button')
    fireEvent.click(searchButton)

    const searchInput = screen.getByPlaceholderText('common.search')
    userEvent.type(searchInput, 'test')
    fireEvent.blur(searchInput)
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveValue('test')
  })

  it('should update search value on input', () => {
    renderWithProviders(<SearchBar />, preloadedState)

    const searchButton = screen.getByRole('button')
    fireEvent.click(searchButton)

    const searchInput = screen.getByPlaceholderText('common.search')
    fireEvent.change(searchInput, { target: { value: 'meeting' } })

    expect(searchInput).toHaveValue('meeting')
  })

  it('should open filter popover when tune icon is clicked', async () => {
    renderWithProviders(<SearchBar />, preloadedState)

    // Expand search bar
    const searchButton = screen.getByRole('button')
    fireEvent.click(searchButton)

    // Click tune icon
    const tuneButton = screen.getByTestId('TuneIcon')
    if (tuneButton) fireEvent.click(tuneButton)

    await waitFor(() => {
      expect(screen.getByText('search.searchIn')).toBeInTheDocument()
    })
  })

  it('names the "Search in" select after its label', async () => {
    renderWithProviders(<SearchBar />, preloadedState)

    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByTestId('TuneIcon'))

    expect(
      await screen.findByRole('combobox', { name: 'search.searchIn' })
    ).toBeInTheDocument()
  })

  it('names the Organizers and Participants fields after their labels', async () => {
    renderWithProviders(<SearchBar />, preloadedState)

    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByTestId('TuneIcon'))

    expect(
      await screen.findByRole('combobox', { name: 'search.organizers' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: 'search.participants' })
    ).toBeInTheDocument()
  })

  it('names the Keywords field after its label and marks it required', async () => {
    renderWithProviders(<SearchBar />, preloadedState)

    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByTestId('TuneIcon'))

    const keywords = await screen.findByRole('textbox', {
      name: 'search.keywords'
    })
    expect(keywords).toBeRequired()
  })

  it('should clear search value when clear button is clicked', () => {
    renderWithProviders(<SearchBar />, preloadedState)

    const searchButton = screen.getByRole('button')
    fireEvent.click(searchButton)

    const searchInput = screen.getByPlaceholderText('common.search')
    fireEvent.change(searchInput, { target: { value: 'meeting' } })

    const clearButton = screen.getByTestId('HighlightOffIcon')
    fireEvent.click(clearButton)

    expect(searchInput).toHaveValue('')
  })

  it('should trigger search on Enter key', async () => {
    const searchSpy = vi.spyOn(searchThunk, 'searchEvents')

    renderWithProviders(<SearchBar />, preloadedState)

    const searchButton = screen.getByRole('button')
    fireEvent.click(searchButton)

    const searchInput = screen.getByPlaceholderText('common.search')
    fireEvent.change(searchInput, { target: { value: 'test' } })
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith({
        filters: {
          keywords: 'test',
          organizers: [],
          attendees: [],
          searchIn: ['user1/cal1']
        },
        search: 'test'
      })
    })
  })

  describe('Search in', () => {
    const withTeamCalendar = (searchIn: string): Record<string, unknown> => ({
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          'team1/cal1': {
            name: 'Team A',
            id: 'team1/cal1',
            color: { light: '#FF0000', dark: '#000' },
            owner: { emails: ['team-a@example.com'], teamCalendar: true },
            events: {}
          }
        }
      },
      searchResult: {
        searchParams: {
          search: '',
          filters: { searchIn, keywords: '', organizers: [], attendees: [] }
        },
        hits: 0,
        results: [],
        error: null,
        loading: false
      }
    })

    const searchFor = (keyword: string): void => {
      fireEvent.click(screen.getByRole('button'))
      const searchInput = screen.getByPlaceholderText('common.search')
      fireEvent.change(searchInput, { target: { value: keyword } })
      fireEvent.keyDown(searchInput, { key: 'Enter' })
    }

    it('searches the team calendars for "Team calendars"', async () => {
      const searchSpy = vi.spyOn(searchThunk, 'searchEvents')
      renderWithProviders(<SearchBar />, withTeamCalendar('team-calendars'))

      searchFor('standup')

      await waitFor(() => {
        expect(searchSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({ searchIn: ['team1/cal1'] })
          })
        )
      })
    })

    it('leaves the team calendars out of "Shared calendars"', async () => {
      const searchSpy = vi.spyOn(searchThunk, 'searchEvents')
      renderWithProviders(<SearchBar />, withTeamCalendar('shared-calendars'))

      searchFor('standup')

      await waitFor(() => {
        expect(searchSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              searchIn: ['user2/cal1', 'user3/cal1']
            })
          })
        )
      })
    })
  })

  it('should search the keyword in the field, not the previous one, on a second search', async () => {
    const searchSpy = vi.spyOn(searchThunk, 'searchEvents')

    renderWithProviders(<SearchBar />, preloadedState)

    const searchButton = screen.getByRole('button')
    fireEvent.click(searchButton)

    const searchInput = screen.getByPlaceholderText('common.search')
    fireEvent.change(searchInput, { target: { value: 'alpha' } })
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(searchInput, { target: { value: 'beta' } })
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    await waitFor(() => {
      expect(searchSpy).toHaveBeenLastCalledWith({
        filters: {
          keywords: 'beta',
          organizers: [],
          attendees: [],
          searchIn: ['user1/cal1']
        },
        search: 'beta'
      })
    })
  })

  it('should search with keyword on Enter without auto-selecting first suggestion', async () => {
    const mockUser = new SearchResponseItem({
      id: '123',
      emailAddresses: [{ value: 'keyword@example.com' }],
      names: [{ displayName: 'Keyword User' }],
      objectType: 'user'
    })
    mockedSearchPeople.mockResolvedValueOnce([mockUser])

    const searchSpy = vi.spyOn(searchThunk, 'searchEvents')

    renderWithProviders(<SearchBar />, preloadedState)

    const searchButton = screen.getByRole('button')
    fireEvent.click(searchButton)

    const searchInput = screen.getByPlaceholderText('common.search')
    fireEvent.change(searchInput, { target: { value: 'keyword' } })

    await waitFor(() => {
      expect(screen.getByText('Keyword User')).toBeInTheDocument()
    })

    fireEvent.keyDown(searchInput, { key: 'Enter' })

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'keyword',
          filters: expect.objectContaining({
            organizers: []
          })
        })
      )
    })

    expect(screen.queryByTestId('AttendeeChip')).not.toBeInTheDocument()
    expect(searchSpy).toHaveBeenCalledTimes(1)
  })
  it('should not trigger search on Enter key when search is empty', async () => {
    const searchSpy = vi.spyOn(searchThunk, 'searchEvents')

    renderWithProviders(<SearchBar />, preloadedState)

    const searchButton = screen.getByRole('button')
    fireEvent.click(searchButton)

    const searchInput = screen.getByPlaceholderText('common.search')
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    await waitFor(() => {
      expect(searchSpy).not.toHaveBeenCalled()
    })
  })

  it('should not trigger search when filter keywords is empty', async () => {
    const searchSpy = vi.spyOn(searchThunk, 'searchEvents')

    renderWithProviders(<SearchBar />, preloadedState)

    const searchButton = screen.getByRole('button')
    fireEvent.click(searchButton)

    // Click tune icon
    const tuneButton = screen.getByTestId('TuneIcon')
    if (tuneButton) fireEvent.click(tuneButton)

    fireEvent.click(screen.getByText('common.search'))

    await waitFor(() => {
      expect(searchSpy).not.toHaveBeenCalled()
    })
  })
  it('keeps the organizers picked in the filters when reopening them', async () => {
    const searchSpy = vi.spyOn(searchThunk, 'searchEvents')

    renderWithProviders(<SearchBar />, {
      ...preloadedState,
      searchResult: {
        searchParams: {
          search: '',
          filters: {
            searchIn: 'all',
            keywords: '',
            organizers: [{ cn: 'Bob', cal_address: 'bob@example.com' }],
            attendees: []
          }
        },
        hits: 0,
        results: [],
        error: null,
        loading: false
      }
    })

    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByTestId('TuneIcon'))
    fireEvent.click(screen.getByText('common.search'))

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            organizers: ['bob@example.com']
          })
        })
      )
    })
  })

  it('keeps search bar expanded when popover opens', () => {
    renderWithProviders(<SearchBar />, preloadedState)

    fireEvent.click(screen.getByRole('button'))
    const tuneBtn = screen
      .getAllByRole('button')
      .find(b => b.querySelector('[data-testid="TuneIcon"]'))

    fireEvent.click(tuneBtn!)

    expect(screen.getByPlaceholderText('common.search')).toBeInTheDocument()
  })

  it('does NOT collapse search when clicking inside popover', () => {
    renderWithProviders(<SearchBar />, preloadedState)

    fireEvent.click(screen.getByRole('button'))
    const tuneBtn = screen
      .getAllByRole('button')
      .find(b => b.querySelector('[data-testid="TuneIcon"]'))

    fireEvent.click(tuneBtn!)

    fireEvent.mouseDown(screen.getByText('search.searchIn'))

    expect(screen.getByPlaceholderText('common.search')).toBeInTheDocument()
  })

  it('clicking Cancel closes popover and search collapses if empty', async () => {
    renderWithProviders(<SearchBar />, preloadedState)

    fireEvent.click(screen.getByRole('button'))
    const tuneBtn = screen
      .getAllByRole('button')
      .find(b => b.querySelector('[data-testid="TuneIcon"]'))

    fireEvent.click(tuneBtn!)

    fireEvent.click(screen.getByText('common.cancel'))

    await waitFor(() =>
      expect(screen.queryByText('search.searchIn')).not.toBeInTheDocument()
    )
    expect(screen.queryByPlaceholderText('common.search')).toBeNull()
  })

  it('does not collapse when selecting a filter value', async () => {
    renderWithProviders(<SearchBar />, preloadedState)

    fireEvent.click(screen.getByRole('button'))

    const tuneBtn = screen
      .getAllByRole('button')
      .find(b => b.querySelector('[data-testid="TuneIcon"]'))

    fireEvent.click(tuneBtn!)

    fireEvent.mouseDown(screen.getByText('search.searchIn')) // simulate interaction inside menu

    expect(screen.getByPlaceholderText('common.search')).toBeInTheDocument()
  })

  it('keeps input value after popover closes if not empty', () => {
    renderWithProviders(<SearchBar />, preloadedState)

    fireEvent.click(screen.getByRole('button'))
    userEvent.type(screen.getByPlaceholderText('common.search'), 'hello')

    const tuneBtn = screen
      .getAllByRole('button')
      .find(b => b.querySelector('[data-testid="TuneIcon"]'))

    fireEvent.click(tuneBtn!)
    fireEvent.click(document.body)

    const inputAfter = screen.getByPlaceholderText('common.search')
    expect(inputAfter).toHaveValue('hello')
  })

  it('should not immediately sync KeywordsFilter input to top search bar until hitting Enter', async () => {
    renderWithProviders(<SearchBar />, preloadedState)

    // Expand search bar
    fireEvent.click(screen.getByRole('button'))
    const searchInput = screen.getByPlaceholderText('common.search')

    // Open filter popover
    const tuneBtn = screen
      .getAllByRole('button')
      .find(b => b.querySelector('[data-testid="TuneIcon"]'))
    fireEvent.click(tuneBtn!)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('search.keywordsPlaceholder')
      ).toBeInTheDocument()
    })

    const keywordsInput = screen.getByPlaceholderText(
      'search.keywordsPlaceholder'
    )
    fireEvent.change(keywordsInput, { target: { value: 'typed keyword' } })

    // Top search bar should not be updated immediately
    expect(searchInput).toHaveValue('')

    // Press Enter in keywords input
    fireEvent.keyDown(keywordsInput, { key: 'Enter' })

    // Top search bar should now be synced
    expect(searchInput).toHaveValue('typed keyword')
  })
})
