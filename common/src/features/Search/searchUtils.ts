import { SearchFilters } from './SearchSlice'

export function getSearchInCalendars(
  searchIn: string,
  allIds: string[],
  personalIds: string[],
  sharedIds: string[]
): string[] {
  if (!searchIn) return allIds

  if (searchIn === 'my-calendars') return personalIds

  if (searchIn === 'shared-calendars') return sharedIds

  return [searchIn]
}

export function buildQuery(
  searchQuery: string,
  filters: SearchFilters,
  allIds: string[],
  personalIds: string[],
  sharedIds: string[]
):
  | {
      search: string
      filters: {
        searchIn: string[]
        keywords: string
        organizers: string[]
        attendees: string[]
      }
    }
  | undefined {
  const trimmedSearch = searchQuery.trim()
  const trimmedKeywords = filters.keywords.trim()
  const hasSearchCriteria =
    trimmedSearch ||
    trimmedKeywords ||
    filters.organizers.length > 0 ||
    filters.attendees.length > 0

  if (!hasSearchCriteria) return undefined

  return {
    search: trimmedSearch,
    filters: {
      keywords: trimmedKeywords,
      organizers: filters.organizers.map(u => u.cal_address),
      attendees: filters.attendees.map(u => u.cal_address),
      searchIn: getSearchInCalendars(
        filters.searchIn,
        allIds,
        personalIds,
        sharedIds
      )
    }
  }
}
