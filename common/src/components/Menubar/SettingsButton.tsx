import { useAppDispatch } from '@common/app/hooks'
import { Tooltip } from '@common/components/Tooltip'
import { setView } from '@common/features/Settings/SettingsSlice'
import { OPEN_KEYBOARD_SHORTCUTS } from '@common/hooks/useCalendarShortcuts'
import {
  IconButton,
  Menu,
  MenuItem,
  type IconButtonProps
} from '@linagora/twake-mui'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'

export function SettingsButton({
  size
}: {
  size?: IconButtonProps['size']
}): JSX.Element {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  return (
    <>
      <Tooltip title={t('menubar.settings')}>
        <IconButton
          size={size}
          onClick={e => setAnchorEl(e.currentTarget)}
          aria-label={t('menubar.settings')}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchorEl)}
        >
          <SettingsOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          transition: {
            onExited: () => {
              if (showShortcuts) {
                setShowShortcuts(false)
                window.dispatchEvent(new Event(OPEN_KEYBOARD_SHORTCUTS))
              }
            }
          }
        }}
      >
        <MenuItem
          onClick={() => {
            setShowShortcuts(true)
            setAnchorEl(null)
          }}
        >
          {t('shortcuts.title')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null)
            dispatch(setView('settings'))
          }}
        >
          {t('menubar.settings')}
        </MenuItem>
      </Menu>
    </>
  )
}
