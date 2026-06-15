import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { selectCalendars } from '@common/app/selectors/selectCalendars'
import { PeopleSearch } from '@common/components/Attendees/PeopleSearch'
import { User } from '@common/components/Attendees/types'
import { Tooltip } from '@common/components/Tooltip'
import { AttendeesFilter } from '@common/features/Search/AttendeesFilter'
import { KeywordsFilter } from '@common/features/Search/KeywordsFilter'
import { OrganizersFilter } from '@common/features/Search/OrganizersFilter'
import { SearchInFilter } from '@common/features/Search/SearchInFilter'
import {
  clearFilters,
  searchEvents,
  setFilters
} from '@common/features/Search/SearchSlice'
import { buildQuery } from '@common/features/Search/searchUtils'
import { setView } from '@common/features/Settings/SettingsSlice'
import { userAttendee } from '@common/features/User/models/attendee'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  IconButton,
  InputAdornment,
  Popover,
  Stack,
  TextField,
  type AutocompleteRenderInputParams
} from '@linagora/twake-mui'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'

const SEARCH_OBJECT_TYPES = ['user', 'contact']

const isClickInsideSearch = (
  target: Node,
  container: HTMLElement | null,
  input: HTMLElement | null
): boolean => {
  if (container?.contains(target)) return true
  if (input?.contains(target)) return true
  if (target instanceof Element && target.closest('.MuiAutocomplete-popper'))
    return true
  return false
}

const SearchBar: React.FC<{
  onToggleSearch?: (extendedStatus: boolean) => void
}> = ({ onToggleSearch }) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const calendars = useAppSelector(selectCalendars)
  const userId = useAppSelector(state => state.user.userData?.openpaasId)
  const personnalCalendars = userId
    ? calendars.filter(c => extractEventBaseUuid(c.id) === userId)
    : []
  const filters = useAppSelector(
    state => state.searchResult.searchParams.filters
  )

  const [search, setSearch] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<User[]>([])
  const [extended, setExtended] = useState(false)

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const filterOpen = Boolean(anchorEl)
  const [filterError, setFilterError] = useState(false)
  const searchWidth = {
    xs: '10vw',
    sm: '20vw',
    md: '35vw',
    xl: '35vw',
    '@media (min-width: 2000px)': {
      maxWidth: '55vw'
    }
  }

  const inputRef = useRef<HTMLInputElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [popperAnchor, setPopperAnchor] = useState<HTMLDivElement | null>(null)
  const shouldCollapseRef = useRef(false)

  type FilterField = 'searchIn' | 'keywords' | 'organizers' | 'attendees'
  const handleFilterChange = (
    field: FilterField,
    value: string | userAttendee[]
  ): void => {
    dispatch(setFilters({ ...filters, [field]: value }))
    if (field === 'organizers') {
      setSelectedContacts(
        (value as userAttendee[]).map((a: userAttendee) => ({
          displayName: a.cn ?? a.cal_address,
          email: a.cal_address || ''
        }))
      )
    }
  }

  const handleClearFilters = (): void => {
    dispatch(clearFilters())
    setAnchorEl(null)
    setFilterError(false)
  }

  const handleContactSelect = (contacts: User[]): void => {
    setSelectedContacts(contacts)
    setSearch('')
    if (contacts.length > 0) {
      void handleSearch('', {
        ...filters,
        organizers: contacts.map(userAttendee.fromUser.bind(userAttendee))
      })
    }
  }

  const handleSearch = async (
    searchQuery: string,
    filters: {
      searchIn: string
      keywords: string
      organizers: userAttendee[]
      attendees: userAttendee[]
    }
  ): Promise<void> => {
    if (searchQuery) {
      handleFilterChange('keywords', searchQuery)
    }
    const cleanedQuery = buildQuery(
      searchQuery,
      filters,
      calendars.map(calendar => calendar.id),
      personnalCalendars.map(calendar => calendar.id)
    )
    if (cleanedQuery) {
      await dispatch(searchEvents(cleanedQuery))
      dispatch(setView('search'))
      setAnchorEl(null)
    } else {
      if (filterOpen) {
        setFilterError(true)
      }
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (filterOpen) return

      const target = event.target as Node
      if (isClickInsideSearch(target, containerRef.current, inputRef.current))
        return

      const isSearchEmpty = !search.trim() && selectedContacts.length === 0
      if (isSearchEmpty) {
        setExtended(false)
        onToggleSearch?.(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return (): void =>
      document.removeEventListener('mousedown', handleClickOutside)
  }, [filterOpen, onToggleSearch, search, selectedContacts])

  const handleOpenSearch = (): void => {
    setExtended(true)
    onToggleSearch?.(true)
  }

  return (
    <>
      <Box
        ref={(el: HTMLDivElement | null) => {
          containerRef.current = el
          if (el && !popperAnchor) {
            setPopperAnchor(el)
          }
        }}
        sx={{
          position: 'relative',
          width: extended ? '100%' : 'auto',
          maxWidth: searchWidth,
          transition: 'width 0.25s ease-out'
        }}
      >
        {!extended && (
          <Tooltip title={t('tooltip.searchEventsOrCalendars')}>
            <IconButton sx={{ mr: 1 }} onClick={handleOpenSearch}>
              <SearchIcon />
            </IconButton>
          </Tooltip>
        )}

        {extended && (
          <PeopleSearch
            selectedUsers={selectedContacts}
            showCurrentUser
            onChange={(_event, users) => {
              handleContactSelect(users)
            }}
            inputValue={search}
            objectTypes={SEARCH_OBJECT_TYPES}
            onToggleEventPreview={() => {}}
            customSlotProps={{
              popper: {
                anchorEl: popperAnchor,
                placement: 'bottom-start',
                sx: {
                  minWidth: searchWidth,
                  '& .MuiPaper-root': {
                    width: '100%'
                  }
                },
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, 8]
                    }
                  }
                ]
              }
            }}
            customRenderInput={(
              params: AutocompleteRenderInputParams,
              query: string,
              setQuery: (value: string) => void
            ) => (
              <TextField
                {...params}
                fullWidth
                autoFocus
                placeholder={t('common.search')}
                value={query}
                inputRef={(el: HTMLInputElement | null) => {
                  inputRef.current = el
                  const ref = params.slotProps.input.ref
                  if (typeof ref === 'function') {
                    ref(el)
                  } else if (ref && 'current' in ref) {
                    ;(
                      ref as React.MutableRefObject<HTMLInputElement | null>
                    ).current = el
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    void handleSearch(query, filters)
                  }
                }}
                onChange={e => {
                  const value = e.target.value
                  setQuery(value)
                  setSearch(value)
                }}
                variant="outlined"
                sx={{
                  borderRadius: '999px',
                  '& .MuiInputBase-input': { padding: '12px 10px' },
                  animation: 'scaleIn 0.25s ease-out',
                  '@keyframes scaleIn': {
                    from: { transform: 'scaleX(0)', opacity: 0 },
                    to: { transform: 'scaleX(1)', opacity: 1 }
                  },
                  transformOrigin: 'right',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '999px',
                    height: 40,
                    padding: '0 10px'
                  }
                }}
                slotProps={{
                  ...params.slotProps,
                  input: {
                    ...params.slotProps.input,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.secondary' }} />
                          {params.slotProps.input?.startAdornment}
                        </InputAdornment>
                      </>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        {(query || selectedContacts.length > 0) && (
                          <IconButton
                            aria-label={t('common.clear')}
                            onClick={() => {
                              setQuery('')
                              setSearch('')
                              handleFilterChange('keywords', '')
                              setSelectedContacts([])
                            }}
                          >
                            <HighlightOffIcon />
                          </IconButton>
                        )}
                        <IconButton
                          aria-label={t('search.filter.filters')}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setAnchorEl(containerRef.current)
                            handleFilterChange('keywords', query)
                            handleFilterChange(
                              'organizers',
                              selectedContacts.map((attendee: User) =>
                                userAttendee.fromUser(attendee)
                              )
                            )
                          }}
                        >
                          <TuneIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
            )}
            inputStyles={{
              '& .MuiAutocomplete-inputRoot.MuiOutlinedInput-root': {
                py: 0,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                flexDirection: 'row',
                justifyContent: 'space-between'
              }
            }}
          />
        )}
      </Box>

      <Popover
        open={filterOpen}
        anchorEl={anchorEl}
        onClose={handleClearFilters}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { mt: 1.2, width: extended ? searchWidth : 'auto' }
          },
          transition: {
            onExited: () => {
              const isSearchEmpty = !search.trim()
              const hasNoContacts = selectedContacts.length === 0
              const shouldCollapse = shouldCollapseRef.current
              const shouldPerformCollapse =
                isSearchEmpty && hasNoContacts && shouldCollapse

              if (shouldPerformCollapse) {
                setExtended(false)
                onToggleSearch?.(false)
              }
              shouldCollapseRef.current = false
            }
          }
        }}
      >
        <Card sx={{ p: 2, pb: 1 }}>
          <CardContent>
            <Stack spacing={2}>
              <SearchInFilter mode="popover" />
              <KeywordsFilter
                mode="popover"
                error={filterError}
                onErrorClear={() => setFilterError(false)}
                onKeywordsChange={(keyword: string) => setSearch(keyword)}
              />
              <OrganizersFilter
                mode="popover"
                onErrorClear={() => setFilterError(false)}
              />
              <AttendeesFilter
                mode="popover"
                onErrorClear={() => setFilterError(false)}
              />
            </Stack>
          </CardContent>

          <CardActions sx={{ justifyContent: 'flex-end', p: 2, gap: 2 }}>
            <Button
              variant="text"
              onClick={() => {
                handleClearFilters()
                setSelectedContacts([])
                setSearch('')
                shouldCollapseRef.current = true
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleSearch(filters.keywords, filters)}
            >
              {t('common.search')}
            </Button>
          </CardActions>
        </Card>
      </Popover>
    </>
  )
}

export default SearchBar
