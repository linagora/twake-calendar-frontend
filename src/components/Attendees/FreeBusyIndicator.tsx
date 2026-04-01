import { Tooltip } from '@linagora/twake-mui'
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled'
import CloseIcon from '@mui/icons-material/Close'
import { useEffect, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { FreeBusyStatus } from './useFreeBusy'

interface FreeBusyIndicatorProps {
  status: FreeBusyStatus
  size?: number
}

export function FreeBusyIndicator({ status }: FreeBusyIndicatorProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const triggerOpen = () => {
      if (status === 'busy') setOpen(true)
    }
    triggerOpen()
  }, [status])

  if (status !== 'busy') return null

  return (
    <Tooltip
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {t('event.freeBusy.busy')}
          <CloseIcon
            fontSize="inherit"
            style={{ cursor: 'pointer' }}
            onClick={() => setOpen(false)}
          />
        </span>
      }
      open={open}
      disableHoverListener
      placement="bottom-start"
      onClose={() => setOpen(false)}
      slotProps={{ tooltip: { sx: { opacity: 1, bgcolor: 'grey.900' } } }}
    >
      <AccessTimeFilledIcon
        aria-label={t('event.freeBusy.busy')}
        color="warning"
        style={{
          margin: '0 -6px 0 5px',
          flexShrink: 0
        }}
      />
    </Tooltip>
  )
}
