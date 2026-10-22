import { useAppDispatch } from '@common/app/hooks'
import { Tooltip } from '@common/components/Tooltip'
import { setView } from '@common/features/Settings/SettingsSlice'
import { IconButton, type IconButtonProps } from '@linagora/twake-mui'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { useI18n } from 'twake-i18n'

export function SettingsButton({
  size
}: {
  size?: IconButtonProps['size']
}): JSX.Element {
  const { t } = useI18n()
  const dispatch = useAppDispatch()

  return (
    <Tooltip title={t('menubar.settings')}>
      <IconButton
        size={size}
        onClick={() => dispatch(setView('settings'))}
        aria-label={t('menubar.settings')}
      >
        <SettingsOutlinedIcon />
      </IconButton>
    </Tooltip>
  )
}
