import {
  IconButton,
  InputAdornment,
  TextField,
  useTheme,
  type AutocompleteRenderInputParams
} from '@linagora/twake-mui'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import SearchIcon from '@mui/icons-material/Search'
import { Ref } from 'react'
import { useI18n } from 'twake-i18n'
import { User } from '../Attendees/types'

interface SearchTextFieldProps {
  params: AutocompleteRenderInputParams
  query: string
  setQuery: (v: string) => void
  selectedContacts: User[]
  onQueryChange: (v: string) => void
  onEnter: () => void
  onClear: () => void
  inputRef?: Ref<HTMLInputElement>
}

export const SearchTextField: React.FC<SearchTextFieldProps> = ({
  params,
  query,
  setQuery,
  selectedContacts,
  onQueryChange,
  onEnter,
  inputRef,
  onClear
}) => {
  const { t } = useI18n()
  const theme = useTheme()
  return (
    <TextField
      {...params}
      fullWidth
      autoFocus
      inputRef={inputRef}
      placeholder={t('common.search')}
      onKeyDown={e => {
        if (e.key === 'Enter') onEnter()
      }}
      onChange={e => {
        setQuery(e.target.value)
        onQueryChange(e.target.value)
      }}
      variant="outlined"
      InputProps={{
        ...params.InputProps,
        startAdornment: (
          <>
            <InputAdornment position="start">
              <SearchIcon sx={{ color: theme.palette.grey[700] }} />
            </InputAdornment>
            {params.InputProps.startAdornment}
          </>
        ),
        endAdornment: (
          <InputAdornment position="end">
            {(query || selectedContacts.length > 0) && (
              <IconButton aria-label={t('common.clear')} onClick={onClear}>
                <HighlightOffIcon />
              </IconButton>
            )}
          </InputAdornment>
        )
      }}
    />
  )
}
