import { stringAvatar } from '@common/components/Event/utils/eventUtils'
import { BookingSlotsResponse } from '@common/features/booking/types/BookingTypes'
import {
  browserDefaultTimeZone,
  getTimezoneOffset
} from '@common/utils/timezone'
import { Avatar, Box, Typography } from '@linagora/twake-mui'
import React from 'react'
import { useI18n } from 'twake-i18n'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined'
import iconCamera from '@common/static/images/icon-camera.svg'

export const BookingHeader: React.FC<{ bookingInfo: BookingSlotsResponse }> = ({
  bookingInfo
}) => {
  const { t } = useI18n()
  const timeZoneLabel = `(${getTimezoneOffset(browserDefaultTimeZone)}) ${browserDefaultTimeZone.replace(/_/g, ' ')}`
  const cameraIcon = (
    <img src={iconCamera} alt="camera" width={24} height={24} />
  )
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px'
      }}
    >
      <Box sx={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <Avatar
          {...stringAvatar(
            bookingInfo.owner.displayName || bookingInfo.owner.email
          )}
        />

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Typography variant="subtitle1">{bookingInfo.name}</Typography>
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
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: '4px', maxWidth: '320px' }}
            >
              {bookingInfo.description}
            </Typography>
          )}
        </Box>
      </Box>
      <Box
        sx={{
          textAlign: 'right',
          fontSize: '13px',
          color: 'text.secondary',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          whiteSpace: 'nowrap'
        }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: 'flex-end'
            }}
          >
            <LanguageOutlinedIcon sx={{ color: 'text.secondary' }} />
            {timeZoneLabel}
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            justifyContent: 'flex-end'
          }}
        >
          {cameraIcon}
          {t('event.form.videoMeeting')}
        </Typography>
      </Box>
    </Box>
  )
}
