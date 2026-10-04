import React from 'react'
import { Box, Switch } from '@linagora/twake-mui'
import { Tooltip } from '@common/components/Tooltip'
import { useI18n } from 'twake-i18n'

interface BookingStatusSwitchProps {
  active: boolean
  onChange: (active: boolean) => void
  disabled?: boolean
}

export const BookingStatusSwitch: React.FC<BookingStatusSwitchProps> = ({
  active,
  onChange,
  disabled = false
}) => {
  const { t } = useI18n()

  const tooltipTitle = active
    ? t('booking.activeSchedule')
    : t('booking.inactiveSchedule')

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
      <Tooltip title={tooltipTitle}>
        <Switch
          checked={active}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          color="primary"
          slotProps={{
            input: { 'aria-label': t('booking.activeSchedule') }
          }}
        />
      </Tooltip>
    </Box>
  )
}
