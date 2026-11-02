import { useAppSelector } from '@common/app/hooks'
import { useI18n } from 'twake-i18n'

export default function SearchResultsHeading(): JSX.Element {
  const { t } = useI18n()
  const { hits, searchParams, loading, error } = useAppSelector(
    state => state.searchResult
  )
  const keyword =
    searchParams.search.trim() || searchParams.filters.keywords.trim()

  return (
    <>
      {keyword && !loading && error === null
        ? t('search.resultsFor', { smart_count: hits, keyword })
        : t('search.resultsTitle')}
    </>
  )
}
