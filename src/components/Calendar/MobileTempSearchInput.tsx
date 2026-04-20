import React from 'react'
import { TextField } from '@linagora/twake-mui'
import { PeopleSearch } from '../Attendees/PeopleSearch'
import { User } from '../Attendees/types'
import { useI18n } from 'twake-i18n'
import { SearchState } from './utils/tempSearchUtil'

interface MobileTempSearchInputProps {
  tempUsers: User[]
  searchState: SearchState
  handleToggleEventPreview: () => void
  handleChange: (event: React.SyntheticEvent, users: User[]) => void
  handleSearchChange: ({ query, options, loading }: SearchState) => void
}

export const MobileTempSearchInput: React.FC<MobileTempSearchInputProps> = ({
  tempUsers,
  searchState,
  handleToggleEventPreview,
  handleChange,
  handleSearchChange
}) => {
  const { t } = useI18n()

  return (
    <PeopleSearch
      objectTypes={['user', 'resource']}
      selectedUsers={tempUsers}
      onChange={handleChange}
      onToggleEventPreview={handleToggleEventPreview}
      placeholder={t('peopleSearch.availabilityPlaceholder')}
      hideOptions
      onSearchStateChange={handleSearchChange}
      inputValue={searchState.query}
      inputSlot={params => (
        <TextField
          {...params}
          autoFocus
          size="medium"
          sx={{
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none'
            },
            ...(tempUsers.length > 0
              ? {
                  '& .MuiOutlinedInput-root': {
                    flexDirection: 'column',
                    alignItems: 'start',
                    '& .MuiInputBase-input': {
                      width: '100%'
                    }
                  }
                }
              : undefined)
          }}
        />
      )}
    />
  )
}
