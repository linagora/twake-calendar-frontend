import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { MobileSelector } from '@common/components/MobileSelector'
import { setFilters } from '@common/features/Search/SearchSlice'
import { Box, InputLabel, TextField } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

interface Props {
  mode: 'popover' | 'mobile'
  error?: boolean
  onErrorClear?: () => void
  onKeywordsChange?: (keywords: string) => void
}

export const KeywordsFilter: React.FC<Props> = ({
  mode,
  error,
  onErrorClear,
  onKeywordsChange
}) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const filters = useAppSelector(
    state => state.searchResult.searchParams.filters
  )

  const field = (
    <TextField
      fullWidth
      error={error}
      helperText={error ? t('search.error.emptySearch') : ''}
      placeholder={t('search.keywordsPlaceholder')}
      value={filters.keywords}
      onChange={e => {
        dispatch(setFilters({ keywords: e.target.value }))
        if (e.target.value.trim()) {
          onErrorClear?.()
          onKeywordsChange?.(e.target.value)
        }
      }}
      size="small"
    />
  )

  if (mode === 'mobile') {
    return (
      <MobileSelector
        ref={null}
        displayText={t('search.keywords')}
        bottomSheetChildren={() => <Box sx={{ p: 2 }}>{field}</Box>}
      />
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr',
        gap: 2,
        alignItems: 'center'
      }}
    >
      <InputLabel sx={{ m: 0 }}>{t('search.keywords')}</InputLabel>
      {field}
    </Box>
  )
}
