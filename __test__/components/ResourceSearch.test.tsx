import { ResourceSearch, Resource } from '@/components/Attendees/ResourceSearch'
import { searchUsers } from '@/features/User/userAPI'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/Renderwithproviders'

jest.mock('@/features/User/userAPI')
const mockedSearchUsers = searchUsers as jest.MockedFunction<typeof searchUsers>

describe('ResourceSearch', () => {
  const baseResource: Resource = {
    displayName: 'Projector Room'
  }

  function setup(
    selectedResources: Resource[] = [],
    props?: Partial<React.ComponentProps<typeof ResourceSearch>>
  ) {
    const onChange = jest.fn()
    renderWithProviders(
      <ResourceSearch
        objectTypes={['resource']}
        selectedResources={selectedResources}
        onChange={onChange}
        {...props}
      />
    )
    return { onChange }
  }

  beforeEach(() => {
    jest.useFakeTimers()
    mockedSearchUsers.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('calls searchUsers after debounce when typing', async () => {
    mockedSearchUsers.mockResolvedValueOnce([
      baseResource
    ] as unknown as Awaited<ReturnType<typeof searchUsers>>)
    setup()

    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'Room')
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(mockedSearchUsers).toHaveBeenCalledWith('Room', ['resource'])
    })
  })

  it('renders search results and allows selection', async () => {
    mockedSearchUsers.mockResolvedValueOnce([
      baseResource
    ] as unknown as Awaited<ReturnType<typeof searchUsers>>)
    const { onChange } = setup()

    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'Room')
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    const option = await screen.findByText('Projector Room')
    await userEvent.click(option)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled()
    })
  })

  it('does not show already selected resources in options', async () => {
    mockedSearchUsers.mockResolvedValueOnce([
      baseResource
    ] as unknown as Awaited<ReturnType<typeof searchUsers>>)
    setup([baseResource])
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'Projector')
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      // It shouldn't be in the dropdown options anymore
      const options = screen.queryAllByRole('option')
      expect(
        options.find(opt => opt.textContent === 'Projector Room')
      ).toBeUndefined()
    })
  })

  it('respects disabled state', () => {
    setup([], { disabled: true })
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it("no options doesn't show dropdown when input is empty", async () => {
    mockedSearchUsers.mockResolvedValueOnce([
      baseResource
    ] as unknown as Awaited<ReturnType<typeof searchUsers>>)
    setup()
    const input = screen.getByRole('combobox')

    await userEvent.type(input, 'Room')
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    await userEvent.clear(input)

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it("shows 'No results' when search succeeds but returns empty array", async () => {
    mockedSearchUsers.mockResolvedValueOnce([])
    setup()

    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'Room')

    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
      await Promise.resolve()
    })

    const noResults = await screen.findByText(
      'resourceSearch.noResults',
      {},
      { timeout: 5000 }
    )
    expect(noResults).toBeInTheDocument()
  })

  it('clears options when search fails and shows error snackbar', async () => {
    mockedSearchUsers.mockResolvedValueOnce([
      baseResource
    ] as unknown as Awaited<ReturnType<typeof searchUsers>>)
    setup()

    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'Room')
    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByText('Projector Room')).toBeInTheDocument()
    })

    mockedSearchUsers.mockRejectedValueOnce(new Error('Network error'))
    await userEvent.clear(input)
    await userEvent.type(input, 'Error')
    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
    })

    const errorMessage = await screen.findByText('resourceSearch.searchError')
    expect(errorMessage).toBeInTheDocument()

    expect(screen.queryByText('Projector Room')).not.toBeInTheDocument()

    mockedSearchUsers.mockResolvedValueOnce([
      baseResource
    ] as unknown as Awaited<ReturnType<typeof searchUsers>>)
    await userEvent.clear(input)
    await userEvent.type(input, 'Room')
    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByText('Projector Room')).toBeInTheDocument()
    })
  })

  it('shows loading text when searching', async () => {
    let resolveSearch: (value: Resource[]) => void
    const searchPromise = new Promise<Resource[]>(resolve => {
      resolveSearch = resolve
    })
    mockedSearchUsers.mockReturnValueOnce(
      searchPromise as unknown as ReturnType<typeof searchUsers>
    )
    setup()

    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'Room')
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    const loadingText = await screen.findByText(
      'resourceSearch.loading',
      {},
      { timeout: 5000 }
    )
    expect(loadingText).toBeInTheDocument()

    await act(async () => {
      resolveSearch!([baseResource])
      await searchPromise
    })
  })
})
