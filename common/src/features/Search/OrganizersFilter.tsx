import { useId } from 'react'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import UserSearch from '@common/components/Attendees/AttendeeSearch'
import { useFilterSearch } from '@common/components/Menubar/useMobileSearch'
import { Box, InputLabel } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { userAttendee } from '@common/features/User/models/attendee'
import { MobileFilterPicker } from './MobileFilterPicker'
import { setFilters } from './SearchSlice'

interface Props {
  mode: 'popover' | 'mobile'
  onErrorClear?: () => void
}

export const OrganizersFilter: React.FC<Props> = ({ mode, onErrorClear }) => {
  const { t } = useI18n()
  const labelId = useId()
  const dispatch = useAppDispatch()
  const searchParams = useAppSelector(state => state.searchResult.searchParams)

  const mobileSearch = useFilterSearch('organizers', () => {})

  if (mode === 'mobile') {
    return (
      <MobileFilterPicker
        displayText={t('search.organizers')}
        objectTypes={['user', 'resources']}
        {...{
          ...mobileSearch,
          handleContactSelect: mobileSearch.handleContactSelect
        }}
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
        {t('search.organizers')}
      </InputLabel>
      <UserSearch
        attendees={searchParams.filters.organizers}
        setAttendees={(users: userAttendee[]) => {
          dispatch(setFilters({ organizers: users }))
          if (users.length > 0) onErrorClear?.()
        }}
      />
    </Box>
  )
}
