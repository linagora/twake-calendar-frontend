import { useId } from 'react'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import UserSearch from '@common/components/Attendees/AttendeeSearch'
import { useFilterSearch } from '@common/components/Menubar/useMobileSearch'
import { setFilters } from '@common/features/Search/SearchSlice'
import { userAttendee } from '@common/features/User/models/attendee'
import { Box, InputLabel } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { MobileFilterPicker } from './MobileFilterPicker'

interface Props {
  mode: 'popover' | 'mobile'
  onErrorClear?: () => void
}

export const AttendeesFilter: React.FC<Props> = ({ mode, onErrorClear }) => {
  const { t } = useI18n()
  const labelId = useId()
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
        {t('search.participants')}
      </InputLabel>
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
