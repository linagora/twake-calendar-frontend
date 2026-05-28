import { IconButton, Box, Tooltip } from '@linagora/twake-mui'
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined'
import { useI18n } from 'twake-i18n'
import { AppListMenu } from '@common/components/Menubar/AppListMenu'
import { UserMenu } from '@common/components/Menubar/UserMenu'
import { useAppSelector } from '@common/app/hooks'
import { useUtilMenus } from '@common/components/Calendar/hooks/useUtilMenus'

export const UtilButtons: React.FC<{ isIframe?: boolean }> = ({ isIframe }) => {
  const { t } = useI18n()
  const user = useAppSelector(state => state.user.userData)

  const {
    anchorEl,
    supportLink,
    userMenuAnchorEl,
    handleAppMenuOpen,
    handleAppMenuClose,
    handleUserMenuOpen,
    handleUserMenuClose,
    handleSettingsClick,
    handleLogoutClick
  } = useUtilMenus()

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {supportLink && (
        <Tooltip title={t('menubar.help')}>
          <IconButton
            component="a"
            href={supportLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginRight: 4 }}
            aria-label={t('menubar.help')}
          >
            <HelpOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <AppListMenu
        anchorEl={anchorEl}
        onAppMenuOpen={handleAppMenuOpen}
        onAppMenuClose={handleAppMenuClose}
        iconSize="small"
      />

      <UserMenu
        anchorEl={userMenuAnchorEl}
        onClose={handleUserMenuClose}
        onSettingsClick={handleSettingsClick}
        onLogoutClick={() => void handleLogoutClick()}
        onUserMenuOpen={handleUserMenuOpen}
        isIframe={isIframe}
        user={user}
        size="s"
      />
    </Box>
  )
}
