import { useAppSelector } from '@/app/hooks'
import React, { useCallback, useEffect, useState } from 'react'
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  useTheme,
  alpha,
  DialogActions,
  Button
} from '@linagora/twake-mui'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { User } from '../Attendees/types'
import { useI18n } from 'twake-i18n'
import { useTempSearch } from './hooks/useTempSearch'
import { AttendeeOptionsList } from '../Attendees/AttendeeOptionsList'
import { MobileTempSearchInput } from './MobileTempSearchInput'
import { SearchState } from './utils/tempSearchUtil'

interface TempSearchDialogProps {
  tempUsers: User[]
  setTempUsers: (users: User[]) => void
  handleToggleEventPreview: () => void
  onClose: () => void
}

export default function TempSearchDialog({
  tempUsers,
  setTempUsers,
  handleToggleEventPreview,
  onClose
}: TempSearchDialogProps): JSX.Element {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobileSearchOpen = useAppSelector(
    state => state.calendars.isMobileSearchOpen
  )
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    options: [] as User[],
    loading: false
  })

  useEffect(() => {
    const resetSearchState = (): void => {
      setSearchState({ query: '', options: [], loading: false })
    }
    if (isMobileSearchOpen) {
      resetSearchState()
    }
  }, [isMobileSearchOpen])

  const { handleUserChange } = useTempSearch({ setTempUsers, tempUsers })

  const handleSearchChange = useCallback(
    ({ query, options, loading }: SearchState): void => {
      setSearchState(prev => ({
        query: query ?? prev.query,
        options: options ?? prev.options,
        loading: loading ?? prev.loading
      }))
    },
    []
  )

  const handleChange = (event: React.SyntheticEvent, users: User[]): void => {
    handleUserChange(event, users)
    setSearchState(prev => ({ ...prev, query: '' }))
  }

  return (
    <Dialog
      open={isMobileSearchOpen}
      onClose={onClose}
      fullScreen
      slotProps={{
        root: {
          sx: { borderRadius: 0 }
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 1,
          paddingRight: 1,
          paddingTop: 0.5,
          paddingBottom: 0.5,
          boxShadow: `0 8px 0px ${alpha(theme.palette.grey[600], theme.palette.action.focusOpacity)}`
        }}
      >
        <IconButton
          onClick={onClose}
          aria-label={t('common.back')}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon sx={{ color: '#605D62' }} />
        </IconButton>
        <MobileTempSearchInput
          tempUsers={tempUsers}
          handleToggleEventPreview={handleToggleEventPreview}
          handleSearchChange={handleSearchChange}
          searchState={searchState}
          handleChange={handleChange}
        />
      </DialogTitle>

      <DialogContent sx={{ marginTop: 1 }}>
        <AttendeeOptionsList
          options={searchState.options || []}
          onOptionClick={user =>
            handleChange({} as React.SyntheticEvent, [...tempUsers, user])
          }
          selectedUsers={tempUsers}
        />
      </DialogContent>

      {tempUsers.length > 0 && (
        <DialogActions sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="contained" onClick={onClose}>
            {t('common.show')}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}
