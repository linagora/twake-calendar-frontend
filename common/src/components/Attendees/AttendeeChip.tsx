import { getAccessiblePair } from '@common/utils/getAccessiblePair'
import { Box, Chip, Icon, IconButton, useTheme } from '@linagora/twake-mui'
import CircleIcon from '@mui/icons-material/Circle'
import CloseIcon from '@mui/icons-material/Close'
import { ReactElement } from 'react'
import { User } from './types'

export interface AttendeeChipProps {
  option: string | User
  getItemProps: (args: { index: number }) => {
    key: number
    className: string
    disabled: boolean
    'data-item-index': number
    tabIndex: -1
    onDelete: (event: unknown) => void
  }
  getChipIcon?: (user: User) => ReactElement
  index: number
}

export const AttendeeChip: React.FC<AttendeeChipProps> = ({
  option,
  getItemProps,
  getChipIcon,
  index
}) => {
  const theme = useTheme()

  const isString = typeof option === 'string'
  const label = isString ? option : option.displayName || option.email
  const chipColor = isString
    ? theme.palette.grey[200]
    : (option.color?.light ?? theme.palette.grey[200])
  const textColor = getAccessiblePair(chipColor, theme)

  const renderIcon = (): ReactElement | undefined => {
    if (!isString && getChipIcon) {
      return getChipIcon(option)
    }

    if (chipColor) {
      return (
        <Icon sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ color: chipColor }}>
            <CircleIcon fontSize="inherit" color="inherit" />
          </Box>
        </Icon>
      )
    }
  }

  const renderDeleteIcon = (): ReactElement => {
    return (
      <IconButton
        sx={{
          backgroundColor: theme.palette.grey[500],
          width: '20px',
          height: '20px'
        }}
        size="small"
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    )
  }

  return (
    <Chip
      {...getItemProps({ index })}
      key={label}
      variant="filled"
      color="secondary"
      icon={renderIcon()}
      deleteIcon={renderDeleteIcon()}
      style={{
        color: textColor,
        maxWidth: '200px'
      }}
      label={label}
    />
  )
}
