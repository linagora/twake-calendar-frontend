import { SearchCalendarsDialog } from '@common/components/Calendar/RegisterCalendars/SearchCalendarsDialog'
import { SearchState } from '@common/components/Calendar/utils/tempSearchUtil'
import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

let emitSearchState: (state: SearchState) => void

vi.mock('@common/components/Attendees/PeopleSearch', () => ({
  PeopleSearch: ({
    onSearchStateChange
  }: {
    onSearchStateChange: (state: SearchState) => void
  }): JSX.Element => {
    emitSearchState = onSearchStateChange
    return <div data-testid="people-search" />
  }
}))

describe('SearchCalendarsDialog', () => {
  const setup = (): void => {
    renderWithProviders(
      <SearchCalendarsDialog
        objectTypes={['resource']}
        open
        selectedUsers={[]}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onCloseRegister={vi.fn()}
      />
    )
  }

  it('shows no results message when the search found nothing', () => {
    setup()

    act(() =>
      emitSearchState({
        query: 'zzqq',
        options: [],
        loading: false,
        hasSearched: true
      })
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'peopleSearch.noResults'
    )
  })

  it('does not show no results message when the search failed', () => {
    setup()

    act(() =>
      emitSearchState({
        query: 'zzqq',
        options: [],
        loading: false,
        hasSearched: false
      })
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('does not show no results message before any search', () => {
    setup()

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('lists the options instead of the no results message', () => {
    setup()

    act(() =>
      emitSearchState({
        query: 'Room',
        options: [{ displayName: 'Room A', email: 'room-a@test.com' }],
        loading: false,
        hasSearched: true
      })
    )

    expect(screen.getByText('Room A')).toBeInTheDocument()
    expect(screen.queryByText('peopleSearch.noResults')).not.toBeInTheDocument()
  })
})
