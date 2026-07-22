import React from 'react'
import { Box, Typography, Avatar } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import { BookingSlotsResponse } from '@common/features/booking/types/BookingTypes'
import { stringAvatar } from '@common/components/Event/utils/eventUtils'

export const BookingOwnerAvatar: React.FC<{
  owner: BookingSlotsResponse['owner']
  size?: 's' | 'm' | 'l'
}> = ({ owner, size }) => {
  return (
    <Avatar
      size={size}
      {...stringAvatar(owner.displayName || owner.email)}
      sx={{ mr: 1 }}
    />
  )
}

export const BookingOwnerName: React.FC<{
  owner: BookingSlotsResponse['owner']
}> = ({ owner }) => {
  return (
    <Typography variant="subtitle1">
      {owner.displayName || owner.email}
    </Typography>
  )
}

export const BookingOwnerDisplay: React.FC<{
  owner: BookingSlotsResponse['owner']
  size?: 's' | 'm' | 'l'
}> = ({ owner, size }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <BookingOwnerAvatar owner={owner} size={size} />
      <Typography variant="body2">
        {owner.displayName || owner.email}
      </Typography>
    </Box>
  )
}

export const BookingEventDetails: React.FC<{
  bookingInfo: BookingSlotsResponse
}> = ({ bookingInfo }) => {
  const { t } = useI18n()
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mt: 1 }}>
        {bookingInfo.name && (
          <Typography variant="subtitle1">{bookingInfo.name}</Typography>
        )}
        <TimerOutlinedIcon sx={{ color: 'text.secondary' }} />
        <Typography
          variant="caption"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'text.secondary'
          }}
        >
          {t('booking.durationMinutes', {
            count: bookingInfo.durationMinutes
          })}
        </Typography>
      </Box>
      {bookingInfo.description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: '4px' }}>
          {bookingInfo.description}
        </Typography>
      )}
    </>
  )
}
