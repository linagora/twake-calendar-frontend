import { userData } from '@common/features/User/userDataTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { getInitials, stringToGradient } from '@common/utils/avatarUtils'
import { getUserDisplayName } from '@common/utils/userUtils'
import {
  alpha,
  Avatar,
  Box,
  Dialog,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  MenuList,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { MouseEvent } from 'react'
import { useI18n } from 'twake-i18n'
import { Tooltip } from '@common/components/Tooltip'
import { useHighContrast } from '@common/features/Settings/Accessibility/highContrastMode'

export type UserMenuProps = {
  anchorEl: HTMLElement | null
  onClose: () => void
  onSettingsClick: () => void
  onLogoutClick: () => void
  onUserMenuOpen: (event: MouseEvent<HTMLElement>) => void
  user: userData | null
  isIframe?: boolean
  size?: 's' | 'm' | 'l'
}

const sharedPaperSx = {
  minWidth: 280,
  mt: 1,
  padding: '0 !important',
  borderRadius: '14px'
}

const UserMenuContent: React.FC<{
  user: userData | null
  displayName: string
  onSettingsClick: () => void
  onLogoutClick: () => void
}> = ({ user, displayName, onSettingsClick, onLogoutClick }) => {
  const { t } = useI18n()
  const theme = useTheme()
  // R-08, high contrast mode: the menu icons were 2.49:1
  const highContrast = useHighContrast()

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px'
        }}
      >
        <Avatar
          color={stringToGradient(displayName)}
          size="l"
          sx={{ marginBottom: '8px' }}
        >
          {getInitials(displayName)}
        </Avatar>
        <Typography
          sx={{
            color: theme.palette.grey[900],
            fontSize: 22,
            fontWeight: 600
          }}
        >
          {displayName}
        </Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
          {user?.email}
        </Typography>
      </Box>
      <MenuList>
        <MenuItem onClick={onSettingsClick} sx={{ py: 1.5 }}>
          <SettingsOutlinedIcon
            sx={{
              mr: 2,
              color: alpha(theme.palette.grey[900], highContrast ? 0.8 : 0.48),
              fontSize: 20
            }}
          />
          {t('menubar.settings') || 'Settings'}
        </MenuItem>
        <Divider />
        <MenuItem onClick={onLogoutClick} sx={{ py: 1.5 }}>
          <LogoutIcon
            sx={{
              mr: 2,
              color: alpha(theme.palette.grey[900], highContrast ? 0.8 : 0.48),
              fontSize: 20
            }}
          />
          {t('menubar.logout') || 'Logout'}
        </MenuItem>
      </MenuList>
    </>
  )
}

const UserMenuPopup: React.FC<{
  anchorEl: HTMLElement | null
  onClose: () => void
  user: userData | null
  displayName: string
  onSettingsClick: () => void
  onLogoutClick: () => void
  isMobile: boolean
}> = ({
  anchorEl,
  onClose,
  user,
  displayName,
  onSettingsClick,
  onLogoutClick,
  isMobile
}) => {
  const { t } = useI18n()
  const open = Boolean(anchorEl)
  const slotProps = {
    paper: { sx: sharedPaperSx, 'aria-label': t('menubar.userProfile') }
  }
  const content = (
    <UserMenuContent
      user={user}
      displayName={displayName}
      onSettingsClick={onSettingsClick}
      onLogoutClick={onLogoutClick}
    />
  )

  if (isMobile) {
    return (
      <Dialog open={open} onClose={onClose} slotProps={slotProps}>
        {content}
      </Dialog>
    )
  }

  return (
    <Menu
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={slotProps}
    >
      {content}
    </Menu>
  )
}

export function UserMenu({
  anchorEl,
  onClose,
  onSettingsClick,
  onLogoutClick,
  onUserMenuOpen,
  user,
  isIframe = false,
  size = 'm'
}: UserMenuProps): JSX.Element {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const displayName = getUserDisplayName(user)

  return (
    <>
      <Tooltip
        title={isIframe ? t('menubar.settings') : t('menubar.userProfile')}
      >
        <IconButton
          onClick={!isIframe ? onUserMenuOpen : onSettingsClick}
          aria-label={
            isIframe ? t('menubar.settings') : t('menubar.userProfile')
          }
        >
          {!isIframe ? (
            <Avatar color={stringToGradient(displayName)} size={size}>
              {getInitials(displayName)}
            </Avatar>
          ) : (
            <SettingsOutlinedIcon />
          )}
        </IconButton>
      </Tooltip>

      <UserMenuPopup
        anchorEl={anchorEl}
        onClose={onClose}
        user={user}
        displayName={displayName}
        onSettingsClick={onSettingsClick}
        onLogoutClick={onLogoutClick}
        isMobile={isMobile}
      />
    </>
  )
}
