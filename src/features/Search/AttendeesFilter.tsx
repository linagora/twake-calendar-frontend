import { useAppDispatch, useAppSelector } from '@/app/hooks'
import UserSearch from '@/components/Attendees/AttendeeSearch'
import { useFilterSearch } from '@/components/Menubar/useMobileSearch'
import { setFilters } from '@/features/Search/SearchSlice'
import { userAttendee } from '@/features/User/models/attendee'
import { Box, InputLabel } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { MobileFilterPicker } from './MobileFilterPicker'

interface Props {
  mode: 'popover' | 'mobile'
  onErrorClear?: () => void
}

export const AttendeesFilter: React.FC<Props> = ({ mode, onErrorClear }) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const filters = useAppSelector(
    state => state.searchResult.searchParams.filters
  )

  const mobileSearch = useFilterSearch('attendees', () => {})

  if (mode === 'mobile') {
    return (
      <MobileFilterPicker
        displayText={t('search.participants')}
        objectTypes={['user', 'contact']}
        {...mobileSearch}
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
      <InputLabel sx={{ m: 0 }}>{t('search.participants')}</InputLabel>
      <UserSearch
        attendees={filters.attendees}
        setAttendees={(users: userAttendee[]) => {
          dispatch(setFilters({ attendees: users }))
          if (users.length > 0) onErrorClear?.()
        }}
      />
    </Box>
  )
}
