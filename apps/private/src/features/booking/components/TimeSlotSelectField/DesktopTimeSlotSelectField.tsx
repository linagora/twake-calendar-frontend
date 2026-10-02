import React from 'react'
import { Select, MenuItem } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { TIME_SLOT_OPTIONS, TimeSlotSelectFieldProps } from './index.type'

export const DesktopTimeSlotSelectField: React.FC<TimeSlotSelectFieldProps> = ({
  duration,
  setDuration
}) => {
  const { t } = useI18n()

  return (
    <Select
      value={duration ?? ''}
      onChange={e => setDuration(Number(e.target.value))}
      SelectDisplayProps={{ 'aria-label': t('booking.chooseTimeSlot') }}
    >
      {TIME_SLOT_OPTIONS.map(({ value, label }) => (
        <MenuItem key={value} value={value}>
          {t(label)}
        </MenuItem>
      ))}
    </Select>
  )
}
