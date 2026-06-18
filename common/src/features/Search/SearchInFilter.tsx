import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { selectCalendars } from '@common/app/selectors/selectCalendars'
import { CalendarItemList } from '@common/components/Calendar/CalendarItemList'
import { CalendarName } from '@common/components/Calendar/CalendarName'
import { useFilterSearch } from '@common/components/Menubar/useMobileSearch'
import {
  MobileSelector,
  MobileSelectorHandle
} from '@common/components/MobileSelector'
import { SearchFilters, setFilters } from '@common/features/Search/SearchSlice'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
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
import { Calendar } from '@common/types/CalendarTypes'
import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'

interface Props {
  mode: 'popover' | 'mobile'
}

export const SearchInFilter: React.FC<Props> = ({ mode }) => {
  const { t } = useI18n()
  const inputSize = useResponsiveInputSize()
  const dispatch = useAppDispatch()
  const searchParams = useAppSelector(state => state.searchResult.searchParams)
  const calendars = useAppSelector(selectCalendars)
  const userId = useAppSelector(state => state.user.userData?.openpaasId)
  const personalCalendars = userId
    ? calendars.filter(c => extractEventBaseUuid(c.id) === userId)
    : []

  const sharedCalendars = userId
    ? calendars.filter(c => extractEventBaseUuid(c.id) !== userId)
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
        sharedCalendars={sharedCalendars}
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
        size={inputSize}
        displayEmpty
        value={searchParams.filters.searchIn}
        onChange={e => dispatch(setFilters({ searchIn: e.target.value }))}
        sx={{ height: '40px' }}
      >
        <MenuItem value="">
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {t('search.filter.allCalendar')}
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem
          value="my-calendars"
          sx={{ color: 'text.secondary', fontSize: '12px' }}
        >
          {t('search.filter.myCalendar')}
        </MenuItem>
        {CalendarItemList(personalCalendars)}
        <Divider />
        <MenuItem
          value="shared-calendars"
          sx={{ color: 'text.secondary', fontSize: '12px' }}
        >
          {t('search.filter.sharedCalendars')}
        </MenuItem>
        {CalendarItemList(sharedCalendars)}
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

  if (filters.searchIn === 'shared-calendars') {
    return t('search.filter.sharedCalendars')
  }

  const selected = personalCalendars.find(c => c.id === filters.searchIn)
  return selected ? <CalendarName calendar={selected} /> : t('search.searchIn')
}

const CalendarMobileSelector: React.FC<{
  selectorRef: React.RefObject<MobileSelectorHandle>
  filters: SearchFilters
  personalCalendars: Calendar[]
  sharedCalendars: Calendar[]
  t: (key: string) => string
  handleSelect: (value: string) => void
}> = ({
  selectorRef,
  filters,
  personalCalendars,
  sharedCalendars,
  t,
  handleSelect
}) => {
  const allCalendar = [...personalCalendars, ...sharedCalendars]
  return (
    <MobileSelector
      ref={selectorRef}
      displayText={getDisplayLabel(filters, allCalendar, t)}
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
        <Divider />
        <ListItemButton
          selected={filters.searchIn === 'shared-calendars'}
          onClick={() => handleSelect('shared-calendars')}
        >
          <ListItemText primary={t('search.filter.sharedCalendars')} />
        </ListItemButton>
        {sharedCalendars.map(c => (
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
