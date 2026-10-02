import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { CalendarItemList } from '@common/components/Calendar/CalendarItemList'
import { CalendarName } from '@common/components/Calendar/CalendarName'
import {
  useCalendars,
  useFilterSearch
} from '@common/components/Menubar/useMobileSearch'
import {
  MobileSelector,
  MobileSelectorHandle
} from '@common/components/MobileSelector'
import { SearchFilters, setFilters } from '@common/features/Search/SearchSlice'
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
import { useRef, useId } from 'react'
import { useI18n } from 'twake-i18n'
import { Calendar } from '@common/types/CalendarTypes'
import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'

interface Props {
  mode: 'popover' | 'mobile'
}

export const SearchInFilter: React.FC<Props> = ({ mode }) => {
  const { t } = useI18n()
  const labelId = useId()
  const inputSize = useResponsiveInputSize()
  const dispatch = useAppDispatch()
  const searchParams = useAppSelector(state => state.searchResult.searchParams)
  const { personalCalendars, sharedCalendars, teamCalendars } = useCalendars()

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
        teamCalendars={teamCalendars}
        t={t}
        handleSelect={v => void handleSelect(v)}
      />
    )
  }

  return (
    <Box
      role="group"
      aria-labelledby={labelId}
      sx={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr',
        gap: 2,
        alignItems: 'center'
      }}
    >
      <InputLabel id={labelId} sx={{ m: 0 }}>
        {t('search.searchIn')}
      </InputLabel>
      <Select
        labelId={labelId}
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
        <Divider />
        <MenuItem
          value="team-calendars"
          sx={{ color: 'text.secondary', fontSize: '12px' }}
        >
          {t('search.filter.teamCalendars')}
        </MenuItem>
        {CalendarItemList(teamCalendars)}
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

  if (filters.searchIn === 'team-calendars') {
    return t('search.filter.teamCalendars')
  }

  const selected = personalCalendars.find(c => c.id === filters.searchIn)
  return selected ? <CalendarName calendar={selected} /> : t('search.searchIn')
}

const CalendarMobileSelector: React.FC<{
  selectorRef: React.RefObject<MobileSelectorHandle>
  filters: SearchFilters
  personalCalendars: Calendar[]
  sharedCalendars: Calendar[]
  teamCalendars: Calendar[]
  t: (key: string) => string
  handleSelect: (value: string) => void
}> = ({
  selectorRef,
  filters,
  personalCalendars,
  sharedCalendars,
  teamCalendars,
  t,
  handleSelect
}) => {
  const allCalendar = [
    ...personalCalendars,
    ...sharedCalendars,
    ...teamCalendars
  ]
  return (
    <MobileSelector
      ref={selectorRef}
      displayText={getDisplayLabel(filters, allCalendar, t)}
      label={t('search.searchIn')}
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
        <Divider />
        <ListItemButton
          selected={filters.searchIn === 'team-calendars'}
          onClick={() => handleSelect('team-calendars')}
        >
          <ListItemText primary={t('search.filter.teamCalendars')} />
        </ListItemButton>
        {teamCalendars.map(c => (
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
