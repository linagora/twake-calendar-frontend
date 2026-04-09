import { getTimezoneOffset } from '@/utils/timezone'
import {
  Box,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import { Check as CheckIcon } from '@mui/icons-material'
import React from 'react'

interface TimezoneListItemProps {
  tz: string
  referenceDate: Date
  isSelected: boolean
  onSelect: (tz: string) => void
  selectedRef: React.RefObject<HTMLDivElement> | null
}

export const TimezoneListItem: React.FC<TimezoneListItemProps> = ({
  tz,
  referenceDate,
  isSelected,
  onSelect,
  selectedRef
}) => {
  const theme = useTheme()
  const offset = getTimezoneOffset(tz, referenceDate)
  const label = tz.split('/').pop()?.replace(/_/g, ' ') || tz

  return (
    <ListItem disablePadding>
      <ListItemButton
        selected={isSelected}
        aria-selected={isSelected}
        ref={isSelected ? selectedRef : null}
        onClick={() => onSelect(tz)}
        sx={{ py: 1 }}
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography>
                ({offset}) {label}
              </Typography>
            </Box>
          }
        />
        {isSelected && (
          <CheckIcon
            sx={{ color: theme.palette.primary.main, fontSize: '20px' }}
          />
        )}
      </ListItemButton>
    </ListItem>
  )
}
