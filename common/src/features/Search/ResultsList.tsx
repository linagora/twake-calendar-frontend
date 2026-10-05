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
import { VisuallyHidden } from '@common/components/VisuallyHidden'

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

  // The results replace the page without moving the focus: say what happened
  const status = loading
    ? t('a11y.loading')
    : error
      ? ''
      : hits
        ? t('a11y.searchResultsCount', { smart_count: hits })
        : t('search.noResults')

  return (
    <>
      <VisuallyHidden role="status">{status}</VisuallyHidden>
      {renderContent()}
    </>
  )

  function renderContent(): React.ReactNode {
    if (loading) {
      return (
        <Box className="loading">
          <CircularProgress size={32} aria-label={t('a11y.loading')} />
        </Box>
      )
    }

    if (error) {
      return (
        <Box className="error">
          <Typography role="alert" className="error-text">
            {error}
          </Typography>
        </Box>
      )
    }

    if (!hits) {
      return (
        <Box className="noResults">
          <img className="logoNoResults" src={logo} alt="" />
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
}
