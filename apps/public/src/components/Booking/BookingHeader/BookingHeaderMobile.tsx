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

export const BookingHeaderMobile: React.FC<{
  bookingInfo: BookingSlotsResponse
}> = ({ bookingInfo }) => {
  const { t } = useI18n()
  const timeZoneLabel = `(${getTimezoneOffset(browserDefaultTimeZone)}) ${browserDefaultTimeZone.replace(/_/g, ' ')}`
  const cameraIcon = (
    <img
      src={iconCamera}
      alt={t('booking.cameraIcon')}
      width={24}
      height={24}
    />
  )
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexDirection: 'column',
        gap: '16px',
        p: '24px',
        pb: 0
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
          flexDirection: 'column'
        }}
      >
        <Avatar
          size="s"
          {...stringAvatar(
            bookingInfo.owner.displayName || bookingInfo.owner.email
          )}
        />

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
      <Box
        sx={{
          textAlign: 'right',
          fontSize: '13px',
          color: 'text.secondary',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          whiteSpace: 'nowrap'
        }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'flex-start'
            }}
          >
            <LanguageOutlinedIcon sx={{ color: 'text.secondary' }} />
            {timeZoneLabel}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }}
        >
          {cameraIcon}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              alignItems: 'flex-start'
            }}
          >
            <Typography variant="caption">
              {t('event.form.videoMeeting')}
            </Typography>
            <Typography variant="overline">
              {t('booking.videoMeetingCaption')}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
