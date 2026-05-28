import {
  TextField,
  useTheme,
  useMediaQuery,
  InputAdornment
} from '@linagora/twake-mui'
import Tooltip from '@common/components/Tooltip'
import SearchIcon from '@mui/icons-material/Search'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { PeopleSearch } from '@common/components/Attendees/PeopleSearch'
import { User } from '@common/components/Attendees/types'
import { useTempSearch } from './hooks/useTempSearch'

export const TempCalendarsInput: React.FC<{
  tempUsers: User[]
  setTempUsers: (users: User[]) => void
  handleToggleEventPreview: () => void
  onOpenSearchOnMobile?: () => void
}> = ({
  tempUsers,
  setTempUsers,
  handleToggleEventPreview,
  onOpenSearchOnMobile
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { t } = useI18n()

  const { handleUserChange } = useTempSearch({ setTempUsers, tempUsers })

  const handleInputFocus = (
    e: React.FocusEvent<HTMLInputElement>
  ): void | undefined => {
    if (!isMobile || !onOpenSearchOnMobile) return
    onOpenSearchOnMobile()
    e.currentTarget.blur()
  }

  return (
    <Tooltip title={t('tooltip.availabilityPlaceholder')}>
      <span style={{ display: 'block' }}>
        <PeopleSearch
          objectTypes={['user', 'resource']}
          selectedUsers={tempUsers}
          onChange={handleUserChange}
          onToggleEventPreview={handleToggleEventPreview}
          placeholder={t('peopleSearch.availabilityPlaceholder')}
          inputSlot={params => (
            <TextField
              {...params}
              size="small"
              onFocus={handleInputFocus}
              slotProps={{
                ...params.slotProps,
                input: {
                  ...params.slotProps?.input,
                  endAdornment: (
                    <React.Fragment>
                      {params.slotProps?.input?.endAdornment}
                      {isMobile && (
                        <InputAdornment position="end">
                          <SearchIcon sx={{ color: 'action.active' }} />
                        </InputAdornment>
                      )}
                    </React.Fragment>
                  )
                }
              }}
              sx={
                tempUsers.length > 0
                  ? {
                      '& .MuiOutlinedInput-root': {
                        flexDirection: 'column',
                        alignItems: 'start',
                        '& .MuiInputBase-input': {
                          width: '100%'
                        }
                      }
                    }
                  : undefined
              }
            />
          )}
        />
      </span>
    </Tooltip>
  )
}
