import { getAccessiblePair } from '@common/utils/getAccessiblePair'
import { Box, Chip, Icon, IconButton, useTheme } from '@linagora/twake-mui'
import CircleIcon from '@mui/icons-material/Circle'
import CloseIcon from '@mui/icons-material/Close'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import { ReactElement } from 'react'
import { User } from './types'

export interface AttendeeChipAction {
  isDelegateHost: boolean
  onToggle: () => void
}

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
  // WS3 host-delegation: when provided, renders a crown toggle inside
  // the chip label that flips the attendee's is_delegate_host bit.
  // Return undefined to suppress the toggle for a given user (e.g. the
  // organizer or a resource).
  getChipAction?: (user: User) => AttendeeChipAction | undefined
  index: number
}

export const AttendeeChip: React.FC<AttendeeChipProps> = ({
  option,
  getItemProps,
  getChipIcon,
  getChipAction,
  index
}) => {
  const theme = useTheme()

  const isString = typeof option === 'string'
  const label = isString ? option : option.displayName || option.email
  const chipColor = isString
    ? theme.palette.grey[200]
    : (option.color?.light ?? theme.palette.grey[200])
  const textColor = getAccessiblePair(chipColor, theme)

  const chipAction = !isString && getChipAction ? getChipAction(option) : undefined

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

  const renderLabel = (): ReactElement => {
    if (!chipAction) {
      return <>{label}</>
    }
    const CrownIcon = chipAction.isDelegateHost
      ? WorkspacePremiumIcon
      : WorkspacePremiumOutlinedIcon
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <span>{label}</span>
        <IconButton
          size="small"
          onMouseDown={(e): void => {
            // Stop the Chip from swallowing the click as a "select" event
            e.stopPropagation()
          }}
          onClick={(e): void => {
            e.stopPropagation()
            chipAction.onToggle()
          }}
          sx={{ padding: 0, color: 'inherit' }}
          aria-pressed={chipAction.isDelegateHost}
          title={
            chipAction.isDelegateHost
              ? 'Delegate host (will get admin on the Meet room)'
              : 'Mark as delegate host'
          }
        >
          <CrownIcon fontSize="small" />
        </IconButton>
      </Box>
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
        maxWidth: '240px'
      }}
      label={renderLabel()}
    />
  )
}
