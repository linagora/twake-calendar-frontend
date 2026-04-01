import { IconButton, Popover } from '@linagora/twake-mui'
import WidgetsOutlinedIcon from '@mui/icons-material/WidgetsOutlined'
import { useI18n } from 'twake-i18n'
import { AppIcon, AppIconProps } from './AppIcon'

export function AppListMenu({
  anchorEl,
  onAppMenuOpen,
  onAppMenuClose
}: {
  anchorEl: HTMLElement | null
  onAppMenuOpen: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void
  onAppMenuClose: () => void
}) {
  const { t } = useI18n()

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
        <WidgetsOutlinedIcon />
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={onAppMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { minWidth: 230, mt: 2, p: '14px 8px', borderRadius: '14px' }
          }
        }}
      >
        <div className="app-grid">
          {applist.map((prop: AppIconProps) => (
            <AppIcon key={prop.name} prop={prop} />
          ))}
        </div>
      </Popover>
    </>
  )
}
