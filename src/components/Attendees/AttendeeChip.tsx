import { Chip, useTheme, Icon, IconButton } from '@linagora/twake-mui'
import { User } from './types'
import { getAccessiblePair } from '@/utils/getAccessiblePair'
import { ReactElement } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import CircleIcon from '@mui/icons-material/Circle'

export interface AttendeeChipProps {
  option: string | User
  getTagProps: (args: { index: number }) => {
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
  getTagProps,
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
          <CircleIcon sx={{ color: chipColor }} />
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
      {...getTagProps({ index })}
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
