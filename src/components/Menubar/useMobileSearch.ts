import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { selectCalendars } from '@/app/selectors/selectCalendars'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import {
  clearFilters,
  searchEventsAsync,
  SearchFilters,
  setFilters,
  setSearchQuery
} from '@/features/Search/SearchSlice'
import { buildQuery } from '@/features/Search/searchUtils'
import { setView } from '@/features/Settings/SettingsSlice'
import { createAttendee } from '@/features/User/models/attendee.mapper'
import { extractEventBaseUuid } from '@/utils/extractEventBaseUuid'
import { useCallback, useMemo, useState } from 'react'
import { User } from '../Attendees/types'
import { SearchState } from '../Calendar/utils/tempSearchUtil'

type FilterKey = 'organizers' | 'attendees'

export interface UseFilterSearchResult {
  inputQuery: string
  setInputQuery: React.Dispatch<React.SetStateAction<string>>
  searchState: SearchState
  selectedContacts: User[]
  filters: SearchFilters
  handleSearch: (
    searchQuery: string,
    currentFilters: SearchFilters
  ) => Promise<void>
  handleSearchChange: ({ query, options, loading }: SearchState) => void
  handleContactSelect: (contacts: User[]) => void
  clearAll: () => void
  handleShow: () => void
}

function useFilterSearchState() {
  const [inputQuery, setInputQuery] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<User[]>([])
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    options: [] as User[],
    loading: false
  })
  return {
    inputQuery,
    setInputQuery,
    selectedContacts,
    setSelectedContacts,
    searchState,
    setSearchState
  }
}

function useCalendars(): {
  calendars: Calendar[]
  personalCalendars: Calendar[]
} {
  const calendars = useAppSelector(selectCalendars)
  const userId = useAppSelector(state => state.user.userData?.openpaasId)
  const personalCalendars = useMemo(
    (): Calendar[] =>
      userId
        ? calendars.filter(c => extractEventBaseUuid(c.id) === userId)
        : [],
    [calendars, userId]
  )
  return { calendars, personalCalendars }
}

function useSearchAction(
  dispatch: ReturnType<typeof useAppDispatch>,
  calendarIds: string[],
  personalCalendarIds: string[],
  setDialogOpen: (b: boolean) => void
) {
  return useCallback(
    async (
      searchQuery: string,
      currentFilters: SearchFilters
    ): Promise<void> => {
      const query = buildQuery(
        searchQuery,
        currentFilters,
        calendarIds,
        personalCalendarIds
      )
      if (!query) return
      dispatch(setSearchQuery(query.search))
      await dispatch(searchEventsAsync(query))
      dispatch(setView('search'))
      setDialogOpen(false)
    },
    [dispatch, calendarIds, personalCalendarIds, setDialogOpen]
  )
}

function useSearchChangeHandler(
  setDialogOpen: (b: boolean) => void,
  setSearchState: React.Dispatch<React.SetStateAction<SearchState>>
) {
  return useCallback(
    ({ query, options, loading }: SearchState): void => {
      if (!query) {
        setDialogOpen(false)
        setSearchState({ query: '', options: [], loading: false })
        return
      }
      setDialogOpen(true)
      setSearchState(prev => ({
        query,
        options: options ?? prev.options,
        loading: loading ?? prev.loading
      }))
    },
    [setDialogOpen, setSearchState]
  )
}

function useContactSelectHandler(
  filterKey: FilterKey,
  filters: SearchFilters,
  dispatch: ReturnType<typeof useAppDispatch>,
  setSelectedContacts: React.Dispatch<React.SetStateAction<User[]>>,
  setInputQuery: React.Dispatch<React.SetStateAction<string>>,
  setSearchState: React.Dispatch<React.SetStateAction<SearchState>>,
  handleSearch: (q: string, f: SearchFilters) => Promise<void>
) {
  return useCallback(
    (contacts: User[]): void => {
      const mapped = contacts.map(c =>
        createAttendee({ cal_address: c.email, cn: c.displayName })
      )
      const nextFilters = { ...filters, [filterKey]: mapped }
      setSelectedContacts(contacts)
      dispatch(setFilters(nextFilters))
      setInputQuery('')
      setSearchState({ query: '', options: [], loading: false })
      if (contacts.length > 0) void handleSearch('', nextFilters)
    },
    [
      filters,
      filterKey,
      handleSearch,
      dispatch,
      setSelectedContacts,
      setInputQuery,
      setSearchState
    ]
  )
}

function useClearAll(
  dispatch: ReturnType<typeof useAppDispatch>,
  setDialogOpen: (b: boolean) => void,
  setInputQuery: React.Dispatch<React.SetStateAction<string>>,
  setSelectedContacts: React.Dispatch<React.SetStateAction<User[]>>,
  setSearchState: React.Dispatch<React.SetStateAction<SearchState>>
) {
  return useCallback((): void => {
    setInputQuery('')
    setSelectedContacts([])
    setSearchState({ query: '', options: [], loading: false })
    dispatch(clearFilters())
    setDialogOpen(false)
  }, [
    dispatch,
    setDialogOpen,
    setInputQuery,
    setSelectedContacts,
    setSearchState
  ])
}

export function useFilterSearch(
  filterKey: FilterKey,
  setDialogOpen: (b: boolean) => void
): UseFilterSearchResult {
  const dispatch = useAppDispatch()
  const filters = useAppSelector(
    state => state.searchResult.searchParams.filters
  )
  const { calendars, personalCalendars } = useCalendars()
  const {
    inputQuery,
    setInputQuery,
    selectedContacts,
    setSelectedContacts,
    searchState,
    setSearchState
  } = useFilterSearchState()

  const handleSearch = useSearchAction(
    dispatch,
    calendars.map(c => c.id),
    personalCalendars.map(c => c.id),
    setDialogOpen
  )
  const handleSearchChange = useSearchChangeHandler(
    setDialogOpen,
    setSearchState
  )
  const handleContactSelect = useContactSelectHandler(
    filterKey,
    filters,
    dispatch,
    setSelectedContacts,
    setInputQuery,
    setSearchState,
    handleSearch
  )
  const clearAll = useClearAll(
    dispatch,
    setDialogOpen,
    setInputQuery,
    setSelectedContacts,
    setSearchState
  )
  const handleShow = useCallback(
    () => void handleSearch(inputQuery, filters),
    [inputQuery, filters, handleSearch]
  )

  return {
    inputQuery,
    setInputQuery,
    searchState,
    selectedContacts,
    filters,
    handleSearch,
    handleSearchChange,
    handleContactSelect,
    clearAll,
    handleShow
  }
}
