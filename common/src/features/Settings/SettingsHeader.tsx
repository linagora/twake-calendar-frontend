import { useAppDispatch } from '@common/app/hooks'
import { Box, IconButton, Tab, Tabs } from '@linagora/twake-mui'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useI18n } from 'twake-i18n'
import { SettingsSubTab, SidebarNavItem } from './SettingsPage'
import './SettingsPage.styl'
import { setView } from './SettingsSlice'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'

export const SettingsHeader: React.FC<{
  activeNavItem?: SidebarNavItem
  activeSettingsSubTab: SettingsSubTab
  handleSettingsSubTabChange: (
    _event: React.SyntheticEvent,
    newValue: SettingsSubTab
  ) => void
}> = ({ activeNavItem, activeSettingsSubTab, handleSettingsSubTabChange }) => {
  const dispatch = useAppDispatch()
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const handleBackClick = (): void => {
    dispatch(setView('calendar'))
  }

  return (
    <Box className="settings-content-header">
      {!isMobile && (
        <IconButton
          onClick={handleBackClick}
          aria-label={t('settings.back') || 'Back to calendar'}
          className="back-button"
        >
          <ArrowBackIcon fontSize="inherit" color="inherit" />
        </IconButton>
      )}
      {activeNavItem === 'settings' && (
        <Tabs
          value={activeSettingsSubTab}
          onChange={handleSettingsSubTabChange}
          className={`settings-content-tabs${isMobile ? '--mobile' : ''}`}
        >
          <Tab value="settings" label={t('settings.title')} />
          <Tab value="notifications" label={t('settings.notifications')} />
        </Tabs>
      )}
    </Box>
  )
}
