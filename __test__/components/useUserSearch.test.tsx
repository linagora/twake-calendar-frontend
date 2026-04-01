import { renderHook, act } from '@testing-library/react'
import { useUserSearch } from '@/components/Attendees/useUserSearch'
import { searchUsers } from '@/features/User/userAPI'

jest.mock('@/features/User/userAPI', () => ({
  searchUsers: jest.fn()
}))

describe('useUserSearch', () => {
  const mockSearchUsers = searchUsers as jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useUserSearch({ objectTypes: ['user'], errorMessage: 'Error' })
    )

    expect(result.current.query).toBe('')
    expect(result.current.loading).toBe(false)
    expect(result.current.options).toEqual([])
    expect(result.current.hasSearched).toBe(false)
    expect(result.current.isOpen).toBe(false)
    expect(result.current.inputError).toBeNull()
    expect(result.current.snackbarOpen).toBe(false)
    expect(result.current.snackbarMessage).toBe('')
  })

  it('should debounce and fetch users when query changes', async () => {
    const mockUsers = [{ displayName: 'John Doe', email: 'john@example.com' }]
    mockSearchUsers.mockResolvedValueOnce(mockUsers)

    const { result } = renderHook(() =>
      useUserSearch({ objectTypes: ['user'], errorMessage: 'Error' })
    )

    act(() => {
      result.current.setQuery('John')
    })

    expect(result.current.loading).toBe(false) // Before debounce

    // Wait for the mock promise to resolve within act
    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve() // allow microtasks to flush
    })

    expect(mockSearchUsers).toHaveBeenCalledWith('John', ['user'])
    expect(result.current.loading).toBe(false)
    expect(result.current.options).toEqual(mockUsers)
    expect(result.current.hasSearched).toBe(true)
  })

  it('should clear options and handle empty query', () => {
    const { result } = renderHook(() =>
      useUserSearch({ objectTypes: ['user'], errorMessage: 'Error' })
    )

    act(() => {
      result.current.setQuery('   ') // empty query with spaces
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(mockSearchUsers).not.toHaveBeenCalled()
    expect(result.current.options).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.hasSearched).toBe(false)
  })

  it('should handle search errors and show the custom error message', async () => {
    mockSearchUsers.mockRejectedValueOnce(new Error('API Error'))

    const { result } = renderHook(() =>
      useUserSearch({ objectTypes: ['user'], errorMessage: 'Custom Error' })
    )

    act(() => {
      result.current.setQuery('FailedSearch')
    })

    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve() // allow microtasks to flush
    })

    expect(result.current.hasSearched).toBe(false)
    expect(result.current.loading).toBe(false)
    expect(result.current.snackbarOpen).toBe(true)
    expect(result.current.snackbarMessage).toBe('Custom Error')
  })
})
