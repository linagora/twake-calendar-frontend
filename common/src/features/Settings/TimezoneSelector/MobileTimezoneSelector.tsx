import React from 'react'
import { MobileSelector } from '@common/components/MobileSelector'
import { SmallTimezoneSelector } from '@common/components/Timezone/SmallTimeZoneSelector'
import { useI18n } from 'twake-i18n'

export const MobileTimezoneSelector: React.FC<{
  currentTimezone: string
  onChange: (tz: string) => void
}> = ({ currentTimezone, onChange }) => {
  const { t } = useI18n()
  return (
    <MobileSelector
      displayText={currentTimezone}
      label={t('settings.timeZone')}
      bottomSheetChildren={({ open, onClose }) => (
        <SmallTimezoneSelector
          open={open}
          onClose={onClose}
          value={currentTimezone}
          onChange={(tz: string) => {
            onChange(tz)
            onClose()
          }}
          referenceDate={new Date()}
        />
      )}
    />
  )
}
