import SearchResultsHeading from '@common/features/Search/SearchResultsHeading'
import { defaultSearchParams } from '@common/features/Search/SearchSlice'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

describe('SearchResultsHeading', () => {
  it.each([
    { loading: true, error: null },
    { loading: false, error: 'Network error' },
    { loading: false, error: '' }
  ])('hides stale hits when loading=$loading and error=$error', state => {
    renderWithProviders(
      <h1>
        <SearchResultsHeading />
      </h1>,
      {
        searchResult: {
          ...state,
          searchParams: { ...defaultSearchParams, search: 'new keyword' },
          hits: 42,
          results: []
        }
      }
    )
    expect(screen.getByRole('heading')).toHaveTextContent('search.resultsTitle')
    expect(screen.getByRole('heading')).not.toHaveTextContent('42')
  })

  it('shows a completed zero-hit search using the filter keyword', () => {
    renderWithProviders(
      <h1>
        <SearchResultsHeading />
      </h1>,
      {
        searchResult: {
          loading: false,
          error: null,
          searchParams: {
            search: ' ',
            filters: { ...defaultSearchParams.filters, keywords: ' sprint ' }
          },
          hits: 0,
          results: []
        }
      }
    )
    expect(screen.getByRole('heading')).toHaveTextContent(
      'search.resultsFor(smart_count=0,keyword=sprint)'
    )
  })
})
