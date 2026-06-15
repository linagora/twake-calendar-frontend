import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { selectCalendars } from '@common/app/selectors/selectCalendars'
import { AppDispatch } from '@common/app/store'
import { User } from '@common/components/Attendees/types'
import { SearchState } from '@common/components/Calendar/utils/tempSearchUtil'
import {
  clearFilters,
  searchEvents,
  SearchFilters,
  setFilters,
  setSearchQuery
} from '@common/features/Search/SearchSlice'
import { buildQuery } from '@common/features/Search/searchUtils'
import { setView } from '@common/features/Settings/SettingsSlice'
import { userAttendee } from '@common/features/User/models/attendee'
import { Calendar } from '@common/types/CalendarTypes'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { useCallback, useMemo, useState } from 'react'

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
  currentSearch: string
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
      await dispatch(searchEvents(query))
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
  filterData: {
    filterKey: FilterKey
    filters: SearchFilters
    isMainSearchBar: boolean
    currentSearch: string
    inputQuery: string
  },
  dispatch: AppDispatch,
  setters: StateSetters,
  handleSearch: (q: string, f: SearchFilters) => Promise<void>
): (contacts: User[]) => void {
  const { setInputQuery, setSelectedContacts, setSearchState } = setters
  const { filters, filterKey, isMainSearchBar, currentSearch, inputQuery } =
    filterData
  return useCallback(
    (contacts: User[]): void => {
      const mapped = contacts.map(contact => userAttendee.fromUser(contact))
      const nextFilters = { ...filters, [filterKey]: mapped }
      setSelectedContacts(contacts)
      dispatch(setFilters(nextFilters))

      const searchText = isMainSearchBar ? inputQuery : currentSearch

      setInputQuery('')
      setSearchState({ query: '', options: [], loading: false })
      if (contacts.length > 0) void handleSearch(searchText, nextFilters)
    },
    [
      filters,
      filterKey,
      isMainSearchBar,
      currentSearch,
      inputQuery,
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
  setDialogOpen: (b: boolean) => void,
  isMainSearchBar = false
): UseFilterSearchResult {
  const dispatch = useAppDispatch()
  const searchParams = useAppSelector(state => state.searchResult.searchParams)
  const filters = searchParams.filters
  const currentSearch = searchParams.search
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
    { filterKey, filters, isMainSearchBar, currentSearch, inputQuery },
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
    handleShow,
    currentSearch
  }
}
