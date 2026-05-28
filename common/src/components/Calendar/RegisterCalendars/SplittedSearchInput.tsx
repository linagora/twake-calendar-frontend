import React from 'react'
import { TextField } from '@linagora/twake-mui'
import { User } from '@common/components/Attendees/types'
import { PeopleSearch } from '@common/components/Attendees/PeopleSearch'
import { SplittedSearchInputProps } from './index.types'

export const SplittedSearchInput: React.FC<SplittedSearchInputProps> = ({
  objectTypes,
  searchState,
  selectedUsers,
  onChange,
  onSearchChange
}) => {
  return (
    <PeopleSearch
      objectTypes={objectTypes}
      selectedUsers={selectedUsers}
      onChange={(_event: React.SyntheticEvent, value: User[]): void =>
        void onChange(_event, value)
      }
      hideOptions
      onSearchStateChange={onSearchChange}
      inputValue={searchState.query}
      inputSlot={params => (
        <TextField
          {...params}
          autoFocus
          size="medium"
          sx={{
            '& .MuiOutlinedInput-notchedOutlined': {
              border: 'none'
            },
            ...(selectedUsers.length > 0
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
