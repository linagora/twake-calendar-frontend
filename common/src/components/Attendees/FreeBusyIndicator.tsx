import { Tooltip } from '@linagora/twake-mui'
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import { useI18n } from 'twake-i18n'
import { FreeBusyStatus } from './useFreeBusy'

interface FreeBusyIndicatorProps {
  status: FreeBusyStatus
  size?: number
  isResource?: boolean
}

function labelKey(status: FreeBusyStatus, isResource: boolean): string {
  if (!isResource) return `event.freeBusy.${status}`
  return status === 'busy'
    ? 'event.freeBusy.resourceBusy'
    : 'event.freeBusy.resourceUnknown'
}

export const FreeBusyIndicator: React.FC<FreeBusyIndicatorProps> = ({
  status,
  isResource = false
}) => {
  const { t } = useI18n()
  if (!['busy', 'unknown', 'contact'].includes(status)) return null

  const label = t(labelKey(status, isResource))
  const StatusIcon =
    status === 'busy' ? AccessTimeFilledIcon : HelpOutlineOutlinedIcon

  return (
    <Tooltip
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
        </span>
      }
      leaveDelay={2000}
      placement="bottom-start"
      slotProps={{ tooltip: { sx: { opacity: 1, bgcolor: 'grey.900' } } }}
    >
      <StatusIcon
        titleAccess={label}
        aria-label={label}
        sx={{ color: status === 'busy' ? 'warning.main' : undefined }}
        style={{
          margin: '0 -6px 0 5px',
          flexShrink: 0
        }}
      />
    </Tooltip>
  )
}
