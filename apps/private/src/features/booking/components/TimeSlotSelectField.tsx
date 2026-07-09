import React from 'react'
import { FormControl, Select, MenuItem, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

interface TimeSlotSelectFieldProps {
  duration: number | undefined
  setDuration: (duration: number) => void
}

export const TimeSlotSelectField: React.FC<TimeSlotSelectFieldProps> = ({
  duration,
  setDuration
}) => {
  const { t } = useI18n()

  return (
    <FormControl fullWidth margin="dense" size="small">
      <Typography variant="body2">{t('booking.chooseTimeSlot')}</Typography>
      <Select
        value={duration ?? ''}
        onChange={e => setDuration(Number(e.target.value))}
      >
        <MenuItem value={15}>{t('booking.15minutes')}</MenuItem>
        <MenuItem value={30}>{t('booking.30minutes')}</MenuItem>
        <MenuItem value={45}>{t('booking.45minutes')}</MenuItem>
        <MenuItem value={60}>{t('booking.1hour')}</MenuItem>
        <MenuItem value={120}>{t('booking.2hours')}</MenuItem>
      </Select>
    </FormControl>
  )
}
