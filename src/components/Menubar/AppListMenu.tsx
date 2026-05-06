import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { Dialog, IconButton, Popover } from '@linagora/twake-mui'
import WidgetsOutlinedIcon from '@mui/icons-material/WidgetsOutlined'
import { useI18n } from 'twake-i18n'
import { AppIcon, AppIconProps } from './AppIcon'

const sharedPaperSx = {
  minWidth: 230,
  mt: 2,
  p: '14px 8px',
  borderRadius: '14px'
}

const AppGrid: React.FC<{ applist: AppIconProps[] }> = ({ applist }) => (
  <div className="app-grid">
    {applist.map(prop => (
      <AppIcon key={prop.name} prop={prop} />
    ))}
  </div>
)

const AppListPopup: React.FC<{
  anchorEl: HTMLElement | null
  onAppMenuClose: () => void
  applist: AppIconProps[]
  isMobile: boolean
}> = ({ anchorEl, onAppMenuClose, applist, isMobile }) => {
  const open = Boolean(anchorEl)
  const slotProps = { paper: { sx: sharedPaperSx } }

  if (isMobile) {
    return (
      <Dialog open={open} onClose={onAppMenuClose} slotProps={slotProps}>
        <AppGrid applist={applist} />
      </Dialog>
    )
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onAppMenuClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={slotProps}
    >
      <AppGrid applist={applist} />
    </Popover>
  )
}

export const AppListMenu: React.FC<{
  anchorEl: HTMLElement | null
  onAppMenuOpen: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void
  onAppMenuClose: () => void
  iconSize?: 'inherit' | 'small' | 'medium' | 'large'
}> = ({ anchorEl, onAppMenuOpen, onAppMenuClose, iconSize = 'inherit' }) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const applist: AppIconProps[] = window.appList ?? []
  if (!(applist.length > 0)) {
    return null
  }

  return (
    <>
      <IconButton
        onClick={onAppMenuOpen}
        style={{ marginRight: 8 }}
        aria-label={t('menubar.apps')}
        title={t('menubar.apps')}
      >
        <WidgetsOutlinedIcon fontSize={iconSize} />
      </IconButton>
      <AppListPopup
        anchorEl={anchorEl}
        onAppMenuClose={onAppMenuClose}
        applist={applist}
        isMobile={isMobile}
      />
    </>
  )
}
