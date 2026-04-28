import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { selectCalendars } from '@/app/selectors/selectCalendars'
import { CalendarItemList } from '@/components/Calendar/CalendarItemList'
import { CalendarName } from '@/components/Calendar/CalendarName'
import { useFilterSearch } from '@/components/Menubar/useMobileSearch'
import {
  MobileSelector,
  MobileSelectorHandle
} from '@/components/MobileSelector'
import { SearchFilters, setFilters } from '@/features/Search/SearchSlice'
import { extractEventBaseUuid } from '@/utils/extractEventBaseUuid'
import {
  Box,
  Divider,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Typography
} from '@linagora/twake-mui'
import { useRef } from 'react'
import { useI18n } from 'twake-i18n'
import { Calendar } from '../Calendars/CalendarTypes'

interface Props {
  mode: 'popover' | 'mobile'
}

export const SearchInFilter: React.FC<Props> = ({ mode }) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const searchParams = useAppSelector(state => state.searchResult.searchParams)
  const calendars = useAppSelector(selectCalendars)
  const userId = useAppSelector(state => state.user.userData?.openpaasId)
  const personalCalendars = userId
    ? calendars.filter(c => extractEventBaseUuid(c.id) === userId)
    : []

  const selectorRef = useRef<MobileSelectorHandle>(null)
  const mobileSearch = useFilterSearch('organizers', () => {})

  const handleSelect = async (value: string): Promise<void> => {
    dispatch(setFilters({ searchIn: value }))
    await mobileSearch.handleSearch(searchParams.search, {
      ...searchParams.filters,
      searchIn: value
    })
    selectorRef.current?.onClose()
  }

  if (mode === 'mobile') {
    return (
      <CalendarMobileSelector
        selectorRef={selectorRef}
        filters={searchParams.filters}
        personalCalendars={personalCalendars}
        t={t}
        handleSelect={v => void handleSelect(v)}
      />
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr',
        gap: 2,
        alignItems: 'center'
      }}
    >
      <InputLabel sx={{ m: 0 }}>{t('search.searchIn')}</InputLabel>
      <Select
        displayEmpty
        value={searchParams.filters.searchIn}
        onChange={e => dispatch(setFilters({ searchIn: e.target.value }))}
        sx={{ height: '40px' }}
      >
        <MenuItem value="">
          <Typography sx={{ color: '#243B55', fontSize: '16px' }}>
            {t('search.filter.allCalendar')}
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem
          value="my-calendars"
          sx={{ color: '#243B55', fontSize: '12px' }}
        >
          {t('search.filter.myCalendar')}
        </MenuItem>
        {CalendarItemList(personalCalendars)}
      </Select>
    </Box>
  )
}

const getDisplayLabel = (
  filters: SearchFilters,
  personalCalendars: Calendar[],
  t: (key: string) => string
): string | JSX.Element => {
  if (!filters.searchIn) {
    return t('search.filter.allCalendar')
  }

  if (filters.searchIn === 'my-calendars') {
    return t('search.filter.myCalendar')
  }

  const selected = personalCalendars.find(c => c.id === filters.searchIn)
  return selected ? <CalendarName calendar={selected} /> : t('search.searchIn')
}

const CalendarMobileSelector: React.FC<{
  selectorRef: React.RefObject<MobileSelectorHandle>
  filters: SearchFilters
  personalCalendars: Calendar[]
  t: (key: string) => string
  handleSelect: (value: string) => void
}> = ({ selectorRef, filters, personalCalendars, t, handleSelect }) => {
  return (
    <MobileSelector
      ref={selectorRef}
      displayText={getDisplayLabel(filters, personalCalendars, t)}
    >
      <List>
        <ListItemButton
          selected={filters.searchIn === ''}
          onClick={() => handleSelect('')}
        >
          <ListItemText primary={t('search.filter.allCalendar')} />
        </ListItemButton>

        <Divider />

        <ListItemButton
          selected={filters.searchIn === 'my-calendars'}
          onClick={() => handleSelect('my-calendars')}
        >
          <ListItemText primary={t('search.filter.myCalendar')} />
        </ListItemButton>

        {personalCalendars.map(c => (
          <ListItemButton
            key={c.id}
            selected={filters.searchIn === c.id}
            onClick={() => handleSelect(c.id)}
          >
            <CalendarName calendar={c} />
          </ListItemButton>
        ))}
      </List>
    </MobileSelector>
  )
}
