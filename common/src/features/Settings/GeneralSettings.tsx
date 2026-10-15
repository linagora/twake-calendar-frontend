import { Box } from '@linagora/twake-mui'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { LanguageSelector } from './LanguageSelector'
import { ThemeSelector } from './ThemeSelector'
import { TimezoneSelector } from './TimezoneSelector'
import { WorkingDaysSettings } from './WorkingDaysSettings'
import { CalendarEventsSettings } from './CalendarEventsSettings'

interface GeneralSettingsProps {
  onLanguageError: () => void
  onThemeError: () => void
  onTimeZoneError: () => void
  onHideDeclinedEventsError: () => void
  onDisplayWeekNumbersError: () => void
  onWorkingDaysError: () => void
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  onLanguageError,
  onThemeError,
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

      {/* Theme */}
      {!window.HIDE_THEME_SELECTOR && (
        <ThemeSelector
          inputMinWidth={inputMinWidth}
          onThemeError={onThemeError}
        />
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
