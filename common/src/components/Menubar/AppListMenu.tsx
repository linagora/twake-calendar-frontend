import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { IconButton, Popover, type IconButtonProps } from '@linagora/twake-mui'
import { Dialog } from '@common/ds/Dialog/Dialog'
import WidgetsOutlinedIcon from '@mui/icons-material/WidgetsOutlined'
import { useI18n } from 'twake-i18n'
import { AppIcon, AppIconProps } from './AppIcon'
import Tooltip from '@common/components/Tooltip'

const sharedPaperSx = {
  minWidth: 230,
  mt: 2,
  p: '14px 8px'
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
  buttonSize?: IconButtonProps['size']
}> = ({
  anchorEl,
  onAppMenuOpen,
  onAppMenuClose,
  iconSize = 'inherit',
  buttonSize
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const applist: AppIconProps[] = window.appList ?? []
  if (!(applist.length > 0)) {
    return null
  }

  return (
    <>
      <Tooltip title={t('menubar.apps')}>
        <IconButton
          size={buttonSize}
          onClick={onAppMenuOpen}
          style={{ marginRight: 8 }}
          aria-label={t('menubar.apps')}
        >
          <WidgetsOutlinedIcon fontSize={iconSize} />
        </IconButton>
      </Tooltip>
      <AppListPopup
        anchorEl={anchorEl}
        onAppMenuClose={onAppMenuClose}
        applist={applist}
        isMobile={isMobile}
      />
    </>
  )
}
