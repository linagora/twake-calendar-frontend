import {
  Box,
  CircularProgress,
  Stack,
  SxProps,
  Typography
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import logo from '@common/static/noResult-logo.svg'
import { SearchEventResult } from './types/SearchEventResult'

interface ResultsListProps {
  loading: boolean
  error: string | null
  hits: number | null
  results: SearchEventResult[]
  renderItem: (result: SearchEventResult, idx: number) => React.ReactNode
  noResultsTitleSx?: SxProps
  noResultsSubtitleSx?: SxProps
  stackSx?: SxProps
}

export const ResultsList: React.FC<ResultsListProps> = ({
  loading,
  error,
  hits,
  results,
  renderItem,
  noResultsTitleSx,
  noResultsSubtitleSx,
  stackSx
}) => {
  const { t } = useI18n()

  if (loading) {
    return (
      <Box className="loading">
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box className="error">
        <Typography className="error-text">{error}</Typography>
      </Box>
    )
  }

  if (!hits) {
    return (
      <Box className="noResults">
        <img className="logoNoResults" src={logo} alt={t('search.noResults')} />
        <Typography
          sx={noResultsTitleSx}
          variant={noResultsTitleSx ? undefined : 'h5'}
        >
          {t('search.noResults')}
        </Typography>
        <Typography
          sx={noResultsSubtitleSx}
          variant={noResultsSubtitleSx ? undefined : 'subtitle1'}
        >
          {t('search.noResultsSubtitle')}
        </Typography>
      </Box>
    )
  }

  return (
    <Box className="search-result-content-body">
      <Stack sx={stackSx}>
        {results.map((result, idx) => renderItem(result, idx))}
      </Stack>
    </Box>
  )
}
