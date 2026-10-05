import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography
} from '@linagora/twake-mui'
import SettingsIcon from '@mui/icons-material/Settings'
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew'
import { AccessibilitySettings } from './Accessibility/AccessibilitySettings'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { GeneralSettings } from './GeneralSettings'
import { NotificationsSettings } from './NotificationSettings'
import './SettingsPage.styl'
import { SettingsHeader } from './SettingsHeader'
import type { SidebarNavItem, SettingsSubTab } from './SettingsPage'
import { useHighContrast } from '@common/features/Settings/Accessibility/highContrastMode'
import { HighContrastSwitch } from './Accessibility/HighContrastSwitch'

export const DesktopSettingsPage: React.FC<{
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
  handleSettingsSubTabChange,
  setActiveSettingsSubTab
}) => {
  const { t } = useI18n()
  const highContrast = useHighContrast()

  const [activeNavItem, setActiveNavItem] = useState<SidebarNavItem>('settings')

  const handleNavItemClick = (item: SidebarNavItem): void => {
    setActiveNavItem(item)
    if (item === 'settings') {
      setActiveSettingsSubTab('settings')
    }
  }

  return (
    <>
      <Box
        className="settings-sidebar"
        sx={{ display: 'flex', flexDirection: 'column' }}
      >
        <List>
          <ListItemButton
            className={`settings-nav-item ${activeNavItem === 'settings' ? 'active' : ''}`}
            aria-current={activeNavItem === 'settings' ? 'page' : undefined}
            onClick={() => handleNavItemClick('settings')}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary={t('settings.title') || 'Settings'} />
          </ListItemButton>
          <ListItemButton
            className={`settings-nav-item ${activeNavItem === 'accessibility' ? 'active' : ''}`}
            aria-current={
              activeNavItem === 'accessibility' ? 'page' : undefined
            }
            onClick={() => handleNavItemClick('accessibility')}
          >
            <ListItemIcon>
              <AccessibilityNewIcon />
            </ListItemIcon>
            <ListItemText primary={t('settings.accessibility.title')} />
          </ListItemButton>
        </List>
        <Box sx={{ mt: 'auto', px: 3, pb: 2 }}>
          <HighContrastSwitch sx={{ mb: 1 }} />
          <Typography
            variant="caption"
            // R-08, high contrast mode: real information, not a disabled state
            sx={{ color: highContrast ? 'text.secondary' : 'text.disabled' }}
          >
            version {window.APP_VERSION ?? '2.0'}
          </Typography>
        </Box>
      </Box>
      <Box className="settings-content">
        <SettingsHeader
          activeNavItem={activeNavItem}
          activeSettingsSubTab={activeSettingsSubTab}
          handleSettingsSubTabChange={handleSettingsSubTabChange}
        />
        <Box className="settings-content-body">
          {activeNavItem === 'settings' && (
            <>
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
              {/* left from the mobile layout, before a resize */}
              {activeSettingsSubTab === 'accessibility' && (
                <AccessibilitySettings />
              )}
            </>
          )}
        </Box>
        {activeNavItem === 'accessibility' && (
          <Box className="settings-content-body">
            <AccessibilitySettings />
          </Box>
        )}
        {activeNavItem === 'sync' && (
          <Box className="settings-tab-content">
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {t('settings.sync.empty') || 'Sync settings coming soon'}
            </Typography>
          </Box>
        )}
      </Box>
    </>
  )
}
