import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { selectCalendars } from '@/app/selectors/selectCalendars'
import { AppDispatch } from '@/app/store'
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

interface StateSetters {
  setInputQuery: React.Dispatch<React.SetStateAction<string>>
  setSelectedContacts: React.Dispatch<React.SetStateAction<User[]>>
  setSearchState: React.Dispatch<React.SetStateAction<SearchState>>
}

interface FilterSearchState extends StateSetters {
  inputQuery: string
  selectedContacts: User[]
  searchState: SearchState
}

function useFilterSearchState(
  filters: SearchFilters,
  filterKey: FilterKey
): FilterSearchState {
  const [inputQuery, setInputQuery] = useState('')

  const [selectedContacts, setSelectedContacts] = useState<User[]>(
    filters[filterKey].map(user => ({
      email: user.cal_address,
      displayName: user.cn
    }))
  )
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

interface CalendarsResult {
  calendars: Calendar[]
  personalCalendars: Calendar[]
}

function useCalendars(): CalendarsResult {
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
  dispatch: AppDispatch,
  calendarIds: string[],
  personalCalendarIds: string[],
  setDialogOpen: (b: boolean) => void
): (searchQuery: string, currentFilters: SearchFilters) => Promise<void> {
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
): ({ query, options, loading }: SearchState) => void {
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
  filterData: { filterKey: FilterKey; filters: SearchFilters },
  dispatch: AppDispatch,
  setters: StateSetters,
  handleSearch: (q: string, f: SearchFilters) => Promise<void>
): (contacts: User[]) => void {
  const { setInputQuery, setSelectedContacts, setSearchState } = setters
  const { filters, filterKey } = filterData
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
      setInputQuery,
      setSelectedContacts,
      setSearchState
    ]
  )
}

function useClearAll(
  dispatch: AppDispatch,
  setDialogOpen: (b: boolean) => void,
  setters: StateSetters
): () => void {
  const { setInputQuery, setSelectedContacts, setSearchState } = setters
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
  } = useFilterSearchState(filters, filterKey)

  const setters: StateSetters = {
    setInputQuery,
    setSelectedContacts,
    setSearchState
  }

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
    { filterKey, filters },
    dispatch,
    setters,
    handleSearch
  )
  const clearAll = useClearAll(dispatch, setDialogOpen, setters)
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
