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
import { User } from '@common/components/Attendees/types'
import { useI18n } from 'twake-i18n'
import { AttendeeOptionsList } from '@common/components/Attendees/AttendeeOptionsList'
import { SplittedSearchInput } from './SplittedSearchInput'
import type { SearchCalendarsDialogProps, SearchState } from './index.types'

export const SearchCalendarsDialog: React.FC<SearchCalendarsDialogProps> = ({
  objectTypes,
  open,
  selectedUsers,
  onChange,
  onClose,
  onCloseRegister
}) => {
  const { t } = useI18n()
  const theme = useTheme()
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    options: [] as User[],
    loading: false
  })

  useEffect(() => {
    const resetSearchState = (): void => {
      setSearchState({ query: '', options: [], loading: false })
    }
    if (open) {
      resetSearchState()
    }
  }, [open])

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

  const handleChange = async (
    event: React.SyntheticEvent,
    users: User[]
  ): Promise<void> => {
    await onChange(event, users)
    setSearchState(prev => ({ ...prev, query: '' }))
  }

  const handleClose = (): void => {
    if (selectedUsers?.length > 0) {
      onClose()
      return
    }
    onCloseRegister()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
          onClick={handleClose}
          aria-label={t('common.back')}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon fontSize="inherit" />
        </IconButton>
        <SplittedSearchInput
          objectTypes={objectTypes}
          searchState={searchState}
          selectedUsers={selectedUsers}
          onChange={onChange}
          onSearchChange={handleSearchChange}
        />
      </DialogTitle>

      <DialogContent sx={{ marginTop: 1 }}>
        <AttendeeOptionsList
          options={searchState.options || []}
          onOptionClick={user =>
            void handleChange({} as React.SyntheticEvent, [
              ...selectedUsers,
              user
            ])
          }
          selectedUsers={selectedUsers}
        />
      </DialogContent>

      {selectedUsers.length > 0 && (
        <DialogActions sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="contained" onClick={onClose}>
            {t('common.show')}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}
