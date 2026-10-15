import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Typography
} from '@linagora/twake-mui'
import { useRef, type ReactElement } from 'react'
import { useI18n } from 'twake-i18n'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  setTheme,
  updateUserConfigurations
} from '@common/features/User/UserSlice'
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
  const themeRequestSeq = useRef(0)

  const handleThemeChange = (theme: ThemeSetting): void => {
    const previousTheme = savedTheme ?? null
    const requestSeq = ++themeRequestSeq.current
    dispatch(setTheme(theme))
    dispatch(updateUserConfigurations({ theme }))
      .unwrap()
      .catch(() => {
        // A later choice already replaced this one
        if (requestSeq !== themeRequestSeq.current) return
        dispatch(setTheme(previousTheme))
        onThemeError()
      })
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
