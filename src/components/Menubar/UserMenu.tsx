import { userData } from '@/features/User/userDataTypes'
import { getInitials, stringToGradient } from '@/utils/avatarUtils'
import { getUserDisplayName } from '@/utils/userUtils'
import {
  alpha,
  Avatar,
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { useI18n } from 'twake-i18n'

export type UserMenuProps = {
  anchorEl: HTMLElement | null
  onClose: () => void
  onSettingsClick: () => void
  onLogoutClick: () => void
  onUserMenuOpen: (event: React.MouseEvent<HTMLElement>) => void
  user: userData | null
  isIframe?: boolean
}

export function UserMenu({
  anchorEl,
  onClose,
  onSettingsClick,
  onLogoutClick,
  onUserMenuOpen,
  user,
  isIframe = false
}: UserMenuProps): JSX.Element {
  const { t } = useI18n()
  const theme = useTheme()
  const displayName = getUserDisplayName(user)

  const open = Boolean(anchorEl)

  return (
    <>
      <IconButton
        onClick={!isIframe ? onUserMenuOpen : onSettingsClick}
        aria-label={isIframe ? t('menubar.settings') : t('menubar.userProfile')}
        title={isIframe ? t('menubar.settings') : t('menubar.userProfile')}
      >
        {!isIframe ? (
          <Avatar color={stringToGradient(displayName)} size="m">
            {getInitials(displayName)}
          </Avatar>
        ) : (
          <SettingsOutlinedIcon />
        )}
      </IconButton>

      <Menu
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 280,
              mt: 1,
              padding: '0 !important',
              borderRadius: '14px'
            }
          }
        }}
      >
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
              color: alpha(theme.palette.grey.A900, 0.48),
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
              color: alpha(theme.palette.grey.A900, 0.48),
              fontSize: 20
            }}
          />
          {t('menubar.logout') || 'Logout'}
        </MenuItem>
      </Menu>
    </>
  )
}
