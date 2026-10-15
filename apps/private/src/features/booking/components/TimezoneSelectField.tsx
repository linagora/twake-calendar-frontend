import React from 'react'
import { Box } from '@linagora/twake-mui'
import LanguageIcon from '@mui/icons-material/Language'
import { TimezoneSelector } from '@common/components/Timezone/TimezoneSelector'
import { useI18n } from 'twake-i18n'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'

interface TimezoneSelectFieldProps {
  timezone: string
  setTimezone: (timezone: string) => void
  isExpanded?: boolean
}

export const TimezoneSelectField: React.FC<TimezoneSelectFieldProps> = ({
  timezone,
  setTimezone,
  isExpanded
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  return (
    <FieldWithLabel
      label={isExpanded ? t('event.form.timezone') : ''}
      isExpanded={!!isExpanded && !isMobile}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', py: 1, px: 0 }}>
        {!isExpanded && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              mr: 1.5,
              color: theme => `rgb(${theme.vars.palette.text.primaryChannel})`,
              opacity: 0.9
            }}
          >
            <LanguageIcon />
          </Box>
        )}
        <Box sx={{ flex: 1, display: 'flex' }}>
          <TimezoneSelector
            value={timezone}
            onChange={setTimezone}
            referenceDate={new Date()}
          />
        </Box>
      </Box>
    </FieldWithLabel>
  )
}
