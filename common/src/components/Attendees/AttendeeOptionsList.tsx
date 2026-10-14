import { ListItem, ListItemAvatar } from '@linagora/twake-mui'
import { ListItemText } from '@common/ds/ListItemText/ListItemText'
import React, { HTMLAttributes } from 'react'
import { Typography, Box } from '@linagora/twake-mui'
import { AttendeeAvatar } from './AttendeeAvatar'
import { User } from './types'
import { EmailAddress } from '@common/types/EmailAddress'
import { useI18n } from 'twake-i18n'

export interface AttendeeOptionsListProps extends HTMLAttributes<HTMLLIElement> {
  options: User[]
  onOptionClick?: (user: User) => void
  selectedUsers: User[]
  noResultsText?: string
}

export const AttendeeOptionsList: React.FC<AttendeeOptionsListProps> = ({
  options,
  onOptionClick,
  selectedUsers,
  noResultsText,
  ...props
}) => {
  const { t } = useI18n()
  if (options.length === 0 && noResultsText) {
    return (
      <Typography
        variant="body2"
        role="status"
        sx={{ color: 'text.secondary', py: 1 }}
      >
        {noResultsText}
      </Typography>
    )
  }
  return (
    <>
      {options.map(option => {
        const isSelected = !!selectedUsers.find(u =>
          EmailAddress.sameAddress(u.email, option.email)
        )
        const isNotShowEmail = ['resource', 'team-calendar'].includes(
          option.objectType || ''
        )
        return (
          <ListItem
            key={option.email}
            onClick={() => !isSelected && onOptionClick?.(option)}
            disableGutters
            sx={{
              cursor: isSelected ? 'default' : 'pointer',
              py: 1,
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}
            {...props}
          >
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                opacity: isSelected ? 0.6 : 1
              }}
            >
              <ListItemAvatar>
                <AttendeeAvatar option={option} />
              </ListItemAvatar>
              <ListItemText
                primary={option.displayName || option.email}
                secondary={!isNotShowEmail ? option.email : undefined}
                slotProps={{
                  primary: { variant: 'body2' },
                  secondary: { variant: 'caption' }
                }}
              />
            </Box>
            {isSelected && (
              <Typography
                variant="caption"
                sx={{
                  color: 'warning.dark',
                  display: 'block',
                  mt: 0.5,
                  textAlign: 'left',
                  width: '100%'
                }}
              >
                {t('peopleSearch.emailAlreadyAdded')}
              </Typography>
            )}
          </ListItem>
        )
      })}
    </>
  )
}
