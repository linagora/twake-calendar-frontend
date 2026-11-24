import type { JSX } from 'react'
import { SearchCalendarsDialog } from '@common/components/Calendar/RegisterCalendars/SearchCalendarsDialog'
import { SearchState } from '@common/components/Calendar/utils/tempSearchUtil'
import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

let emitSearchState: (state: SearchState) => void

vi.mock('@common/components/Attendees/PeopleSearch', () => ({
  PeopleSearch: ({
    onSearchStateChange,
    placeholder
  }: {
    onSearchStateChange: (state: SearchState) => void
    placeholder?: string
  }): JSX.Element => {
    emitSearchState = onSearchStateChange
    return <div data-testid="people-search" data-placeholder={placeholder} />
  }
}))

describe('SearchCalendarsDialog', () => {
  const setup = (objectTypes = ['resource']): void => {
    renderWithProviders(
      <SearchCalendarsDialog
        objectTypes={objectTypes}
        open
        selectedUsers={[]}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onCloseRegister={vi.fn()}
      />
    )
  }

  it('hints a resource search when browsing resources', () => {
    setup(['resource'])

    expect(screen.getByTestId('people-search')).toHaveAttribute(
      'data-placeholder',
      'resourceSearch.placeholder'
    )
  })

  it('hints a people search when browsing other calendars', () => {
    setup(['user'])

    expect(screen.getByTestId('people-search')).toHaveAttribute(
      'data-placeholder',
      'peopleSearch.placeholder'
    )
  })

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
