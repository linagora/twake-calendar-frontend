import React from 'react'
import { Box, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined'
import { TimezoneSelector } from '@common/components/Timezone/TimezoneSelector'
import iconCamera from '@common/static/images/icon-camera.svg'

export const BookingMetaInfo: React.FC<{
  selectedTimezone: string
  onTimezoneChange: (tz: string) => void
  referenceDate: Date
}> = ({ selectedTimezone, onTimezoneChange, referenceDate }) => {
  const { t } = useI18n()
  const cameraIcon = <img src={iconCamera} alt="" width={24} height={24} />
  return (
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
          <TimezoneSelector
            value={selectedTimezone}
            onChange={onTimezoneChange}
            referenceDate={referenceDate}
          />
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
  )
}
