import { FormControl, MenuItem, Select } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { AVAILABLE_LANGUAGES } from '@common/features/Settings/constants'
import { LanguageSelectorInputProps } from './index.types'

export const DesktopSelectLanguage: React.FC<LanguageSelectorInputProps> = ({
  currentLanguage,
  onChange
}) => {
  const { t } = useI18n()

  return (
    <FormControl size="small" sx={{ minWidth: 500 }}>
      <Select
        value={currentLanguage}
        onChange={onChange}
        variant="outlined"
        aria-label={t('settings.languageSelector')}
      >
        {AVAILABLE_LANGUAGES.map(({ code, label }) => (
          <MenuItem key={code} value={code} lang={code}>
            {label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
