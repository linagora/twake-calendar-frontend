import {
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemText
} from '@linagora/twake-mui'
import React, { HTMLAttributes } from 'react'
import { stringAvatar } from '@/components/Event/utils/eventUtils'
import { ResourceIcon } from './ResourceIcon'
import { User } from './types'

export interface AttendeeOptionsListProps extends HTMLAttributes<HTMLLIElement> {
  options: User[]
  onOptionClick?: (user: User) => void
  selectedUsers: User[]
}

export const AttendeeOptionsList: React.FC<AttendeeOptionsListProps> = ({
  options,
  onOptionClick,
  selectedUsers,
  ...props
}) => {
  return (
    <>
      {options.map(option => {
        if (selectedUsers.find(u => u.email === option.email)) return null
        const isResource = option.objectType === 'resource'
        return (
          <ListItem
            key={option.email}
            onClick={() => onOptionClick?.(option)}
            disableGutters
            sx={{ cursor: 'pointer', py: 1 }}
            {...props}
          >
            <ListItemAvatar>
              {isResource ? (
                <ResourceIcon avatarUrl={option.avatarUrl} />
              ) : (
                <Avatar {...stringAvatar(option.displayName || option.email)} />
              )}
            </ListItemAvatar>
            <ListItemText
              primary={option.displayName || option.email}
              secondary={!isResource ? option.email : undefined}
              slotProps={{
                primary: { variant: 'body2' },
                secondary: { variant: 'caption' }
              }}
            />
          </ListItem>
        )
      })}
    </>
  )
}
