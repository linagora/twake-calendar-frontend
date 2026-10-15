import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Typography
} from '@linagora/twake-mui'
import type { ReactElement } from 'react'
import { useI18n } from 'twake-i18n'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { updateUserConfigurations } from '@common/features/User/UserSlice'
import { THEME_SETTINGS, type ThemeSetting } from './constants'

export function ThemeSelector({
  inputMinWidth,
  onThemeError
}: {
  inputMinWidth: string | number
  onThemeError: () => void
}): ReactElement {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const savedTheme = useAppSelector(state => state.user.coreConfig.theme)

  const handleThemeChange = (theme: ThemeSetting): void => {
    dispatch(updateUserConfigurations({ theme })).unwrap().catch(onThemeError)
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t('settings.theme')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {t('settings.themeDescription')}
      </Typography>
      <FormControl size="small" sx={{ minWidth: inputMinWidth }}>
        <Select
          value={savedTheme ?? 'auto'}
          onChange={e => handleThemeChange(e.target.value)}
          variant="outlined"
          aria-label={t('settings.themeSelector')}
        >
          {THEME_SETTINGS.map(theme => (
            <MenuItem key={theme} value={theme}>
              {t(`settings.themes.${theme}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}
