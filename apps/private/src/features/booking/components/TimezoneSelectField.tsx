import React from 'react'
import { Box } from '@linagora/twake-mui'
import LanguageIcon from '@mui/icons-material/Language'
import { TimezoneSelector } from '@common/components/Timezone/TimezoneSelector'

interface TimezoneSelectFieldProps {
  timezone: string
  setTimezone: (timezone: string) => void
}

export const TimezoneSelectField: React.FC<TimezoneSelectFieldProps> = ({
  timezone,
  setTimezone
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', py: 1, px: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          mr: 1.5,
          color: theme => theme.palette.grey[900],
          opacity: 0.9
        }}
      >
        <LanguageIcon />
      </Box>
      <Box sx={{ flex: 1, display: 'flex' }}>
        <TimezoneSelector
          value={timezone}
          onChange={setTimezone}
          referenceDate={new Date()}
        />
      </Box>
    </Box>
  )
}
