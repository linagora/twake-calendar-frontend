import { useTheme, MenuItem, Select } from '@linagora/twake-mui'
import LanguageIcon from '@mui/icons-material/Language'
import { AVAILABLE_LANGUAGES } from '@common/features/Settings/constants'
import { useI18n } from 'twake-i18n'
import {
  isValidLanguage,
  usePublicLanguage
} from '../context/PublicLanguageContext'

export const PublicLanguageSelector = (): JSX.Element => {
  const { t } = useI18n()
  const theme = useTheme()
  const { currentLanguage, setCurrentLanguage } = usePublicLanguage()

  return (
    <Select
      value={currentLanguage}
      onChange={e => {
        const nextLang = String(e.target.value)
        if (isValidLanguage(nextLang)) {
          setCurrentLanguage(nextLang)
        }
      }}
      variant="standard"
      disableUnderline
      SelectDisplayProps={{ 'aria-label': t('menubar.languageSelector') }}
      startAdornment={
        <LanguageIcon
          sx={{
            mr: 1,
            fontSize: 20,
            color: theme.palette.text.secondary
          }}
        />
      }
      sx={{
        color: theme.palette.text.secondary,
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
        '& .MuiSelect-select': {
          py: '6px',
          pr: '24px !important',
          display: 'flex',
          alignItems: 'center'
        }
      }}
    >
      {AVAILABLE_LANGUAGES.map(({ code, label }) => (
        <MenuItem key={code} value={code} lang={code}>
          {label}
        </MenuItem>
      ))}
    </Select>
  )
}
