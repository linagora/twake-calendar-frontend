import { Box } from '@linagora/twake-mui'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { LanguageSelector } from './LanguageSelector'
import { TimezoneSelector } from './TimezoneSelector'
import { WorkingDaysSettings } from './WorkingDaysSettings'
import { CalendarEventsSettings } from './CalendarEventsSettings'

interface GeneralSettingsProps {
  onLanguageError: () => void
  onTimeZoneError: () => void
  onHideDeclinedEventsError: () => void
  onDisplayWeekNumbersError: () => void
  onWorkingDaysError: () => void
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  onLanguageError,
  onTimeZoneError,
  onHideDeclinedEventsError,
  onDisplayWeekNumbersError,
  onWorkingDaysError
}) => {
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const inputMinWidth = isMobile ? '100%' : 500

  return (
    <Box className="settings-tab-content">
      {/* Language */}
      {!window.HIDE_LANGUAGE_SELECTOR && (
        <LanguageSelector onLanguageError={onLanguageError} />
      )}

      {/* Timezone */}
      <TimezoneSelector onTimeZoneError={onTimeZoneError} />

      {/* Working Days Settings */}
      <WorkingDaysSettings
        inputMinWidth={inputMinWidth}
        onWorkingDaysError={onWorkingDaysError}
      />

      {/* Calendar & Events Settings */}
      <CalendarEventsSettings
        inputMinWidth={inputMinWidth}
        onHideDeclinedEventsError={onHideDeclinedEventsError}
        onDisplayWeekNumbersError={onDisplayWeekNumbersError}
      />
    </Box>
  )
}
