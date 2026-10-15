import { useTheme, MenuItem, Select } from '@linagora/twake-mui'
import LanguageIcon from '@mui/icons-material/Language'
import { AVAILABLE_LANGUAGES } from '@common/features/Settings/constants'
import {
  isValidLanguage,
  usePublicLanguage
} from '../context/PublicLanguageContext'

export const PublicLanguageSelector = (): JSX.Element => {
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
      startAdornment={
        <LanguageIcon
          sx={{
            mr: 1,
            fontSize: 20,
            color: theme.vars.palette.text.secondary
          }}
        />
      }
      sx={{
        color: theme.vars.palette.text.secondary,
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
        <MenuItem key={code} value={code}>
          {label}
        </MenuItem>
      ))}
    </Select>
  )
}
