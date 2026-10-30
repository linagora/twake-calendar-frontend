import SearchResultsHeading from './SearchResultsHeading'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { Box, IconButton, Typography } from '@linagora/twake-mui'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useI18n } from 'twake-i18n'
import { setView } from '@common/features/Settings/SettingsSlice'
import { ResultsList } from './ResultsList'
import './searchResult.styl'
import DesktopResultItem from './DesktopResultItem'
import { EventDescriptionBuilder } from '@common/utils/EventDescriptionBuilder'

export default function DesktopSearchResultsPage(): JSX.Element {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { error, loading, hits, results } = useAppSelector(
    state => state.searchResult
  )

  const hasDetails = results.some(
    result =>
      result.data.location ||
      new EventDescriptionBuilder(result.data.description ?? '')
        .removeFooter()
        .buildPlainText()
  )
  const hasVideo = results.some(
    result => result.data['x-openpaas-videoconference']
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
          <Typography variant="h5" component="h1">
            <SearchResultsHeading />
          </Typography>
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
            hasDetails={hasDetails}
            hasVideo={hasVideo}
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
