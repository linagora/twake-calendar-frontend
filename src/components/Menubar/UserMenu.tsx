import { userData } from '@/features/User/userDataTypes'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { getInitials, stringToGradient } from '@/utils/avatarUtils'
import { getUserDisplayName } from '@/utils/userUtils'
import {
  alpha,
  Avatar,
  Box,
  Dialog,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { MouseEvent } from 'react'
import { useI18n } from 'twake-i18n'

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
            fontFamily: 'Inter',
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
      <MenuItem onClick={onSettingsClick} sx={{ py: 1.5 }}>
        <SettingsOutlinedIcon
          sx={{
            mr: 2,
            color: alpha(theme.palette.grey[900], 0.48),
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
            color: alpha(theme.palette.grey[900], 0.48),
            fontSize: 20
          }}
        />
        {t('menubar.logout') || 'Logout'}
      </MenuItem>
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
  const open = Boolean(anchorEl)
  const slotProps = { paper: { sx: sharedPaperSx } }
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
      <IconButton
        onClick={!isIframe ? onUserMenuOpen : onSettingsClick}
        aria-label={isIframe ? t('menubar.settings') : t('menubar.userProfile')}
        title={isIframe ? t('menubar.settings') : t('menubar.userProfile')}
      >
        {!isIframe ? (
          <Avatar color={stringToGradient(displayName)} size={size}>
            {getInitials(displayName)}
          </Avatar>
        ) : (
          <SettingsOutlinedIcon />
        )}
      </IconButton>
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
