import { Avatar } from '@common/ds/Avatar/Avatar'
import GroupsIcon from '@mui/icons-material/Groups'
import React from 'react'
import { stringAvatar } from '@common/components/Event/utils/eventUtils'
import { ResourceIcon } from './ResourceIcon'
import { User } from './types'

export interface AttendeeAvatarProps {
  option: User
}

export const AttendeeAvatar: React.FC<AttendeeAvatarProps> = ({ option }) => {
  const isResource = option.objectType === 'resource'
  const isTeamCalendar = option.objectType === 'team-calendar'

  if (isResource) {
    return <ResourceIcon avatarUrl={option.avatarUrl} />
  }

  if (isTeamCalendar) {
    return (
      <Avatar {...stringAvatar(option.displayName || option.email)}>
        <GroupsIcon />
      </Avatar>
    )
  }

  return <Avatar {...stringAvatar(option.displayName || option.email)} />
}
