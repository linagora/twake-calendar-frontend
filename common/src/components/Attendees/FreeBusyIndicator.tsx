import { Tooltip } from '@linagora/twake-mui'
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled'
import { useI18n } from 'twake-i18n'
import { FreeBusyStatus } from './useFreeBusy'

interface FreeBusyIndicatorProps {
  status: FreeBusyStatus
  size?: number
}

export const FreeBusyIndicator: React.FC<FreeBusyIndicatorProps> = ({
  status
}) => {
  const { t } = useI18n()

  if (status !== 'busy') return null

  return (
    <Tooltip
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {t('event.freeBusy.busy')}
        </span>
      }
      leaveDelay={2000}
      placement="bottom-start"
      slotProps={{ tooltip: { sx: { opacity: 1, bgcolor: 'grey.900' } } }}
    >
      <AccessTimeFilledIcon
        aria-label={t('event.freeBusy.busy')}
        sx={{ color: 'warning.main' }}
        style={{
          margin: '0 -6px 0 5px',
          flexShrink: 0
        }}
      />
    </Tooltip>
  )
}
