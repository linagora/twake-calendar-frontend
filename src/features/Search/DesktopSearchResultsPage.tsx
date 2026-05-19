import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Box, IconButton, Typography } from '@linagora/twake-mui'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useI18n } from 'twake-i18n'
import { setView } from '../Settings/SettingsSlice'
import { ResultsList } from './ResultsList'
import './searchResult.styl'
import DesktopResultItem from './DesktopResultItem'

export default function DesktopSearchResultsPage(): JSX.Element {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { error, loading, hits, results } = useAppSelector(
    state => state.searchResult
  )

  return (
    <Box className="search-layout">
      <Box className="search-result-content-header">
        <Box className="back-button">
          <IconButton
            onClick={() => dispatch(setView('calendar'))}
            aria-label={t('settings.back')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">{t('search.resultsTitle')}</Typography>
        </Box>
      </Box>

      <ResultsList
        loading={loading}
        error={error}
        hits={hits}
        results={results}
        renderItem={(result, idx) => (
          <DesktopResultItem
            key={`row-${idx}-event-${result.data.uid}`}
            eventData={result}
          />
        )}
        noResultsTitleSx={{
          fontWeight: 500,
          textAlign: 'center',
          color: 'text.primary'
        }}
        noResultsSubtitleSx={{ color: 'text.secondary' }}
        stackSx={{ mt: 2 }}
      />
    </Box>
  )
}
