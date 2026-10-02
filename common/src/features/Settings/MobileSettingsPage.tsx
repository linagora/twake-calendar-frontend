import { Box } from '@linagora/twake-mui'
import { GeneralSettings } from './GeneralSettings'
import { NotificationsSettings } from './NotificationSettings'
import { AccessibilitySettings } from './Accessibility/AccessibilitySettings'
import './SettingsPage.styl'
import { SettingsHeader } from './SettingsHeader'
import { SettingsSubTab } from './SettingsPage'

export const MobileSettingsPage: React.FC<{
  activeSettingsSubTab: SettingsSubTab
  setLanguageErrorOpen: (open: boolean) => void
  setTimeZoneErrorOpen: (open: boolean) => void
  setAlarmEmailsErrorOpen: (open: boolean) => void
  setHideDeclinedEventsErrorOpen: (open: boolean) => void
  setDisplayWeekNumbersErrorOpen: (open: boolean) => void
  setWorkingDaysErrorOpen: (open: boolean) => void
  setActiveSettingsSubTab: (subTab: SettingsSubTab) => void
  handleSettingsSubTabChange: (
    _event: React.SyntheticEvent,
    newValue: SettingsSubTab
  ) => void
}> = ({
  activeSettingsSubTab,
  setLanguageErrorOpen,
  setTimeZoneErrorOpen,
  setAlarmEmailsErrorOpen,
  setHideDeclinedEventsErrorOpen,
  setDisplayWeekNumbersErrorOpen,
  setWorkingDaysErrorOpen,
  handleSettingsSubTabChange
}) => {
  return (
    <Box className="settings-content" sx={{ borderRadius: 0 }}>
      <SettingsHeader
        activeNavItem="settings"
        activeSettingsSubTab={activeSettingsSubTab}
        handleSettingsSubTabChange={handleSettingsSubTabChange}
      />
      <Box className="settings-content-body">
        {activeSettingsSubTab === 'settings' && (
          <GeneralSettings
            onLanguageError={() => setLanguageErrorOpen(true)}
            onTimeZoneError={() => setTimeZoneErrorOpen(true)}
            onHideDeclinedEventsError={() =>
              setHideDeclinedEventsErrorOpen(true)
            }
            onDisplayWeekNumbersError={() =>
              setDisplayWeekNumbersErrorOpen(true)
            }
            onWorkingDaysError={() => setWorkingDaysErrorOpen(true)}
          />
        )}
        {activeSettingsSubTab === 'notifications' && (
          <NotificationsSettings
            onAlarmEmailsError={() => setAlarmEmailsErrorOpen(true)}
          />
        )}
        {activeSettingsSubTab === 'accessibility' && <AccessibilitySettings />}
      </Box>
    </Box>
  )
}
