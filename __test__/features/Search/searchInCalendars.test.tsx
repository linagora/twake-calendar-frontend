import {
  getSearchInCalendars,
  buildQuery
} from '@common/features/Search/searchUtils'
import { SearchFilters } from '@common/features/Search/SearchSlice'

const ALL_IDS = ['owner/cal1', 'owner/cal2', 'other/cal3', 'other/cal4']
const PERSONAL_IDS = ['owner/cal1', 'owner/cal2']
const SHARED_IDS = ['other/cal3', 'other/cal4']

const baseFilters: SearchFilters = {
  searchIn: '',
  keywords: '',
  organizers: [],
  attendees: []
}

describe('getSearchInCalendars', () => {
  it('returns all ids when searchIn is empty', () => {
    expect(getSearchInCalendars('', ALL_IDS, PERSONAL_IDS, SHARED_IDS)).toEqual(
      ALL_IDS
    )
  })

  it('returns personal ids when searchIn is "my-calendars"', () => {
    expect(
      getSearchInCalendars('my-calendars', ALL_IDS, PERSONAL_IDS, SHARED_IDS)
    ).toEqual(PERSONAL_IDS)
  })

  it('returns shared ids when searchIn is "shared-calendars"', () => {
    expect(
      getSearchInCalendars(
        'shared-calendars',
        ALL_IDS,
        PERSONAL_IDS,
        SHARED_IDS
      )
    ).toEqual(SHARED_IDS)
  })

  it('returns a single-element array when searchIn is a specific calendar id', () => {
    expect(
      getSearchInCalendars('other/cal3', ALL_IDS, PERSONAL_IDS, SHARED_IDS)
    ).toEqual(['other/cal3'])
  })

  it('returns empty shared ids array when there are no shared calendars', () => {
    expect(
      getSearchInCalendars('shared-calendars', PERSONAL_IDS, PERSONAL_IDS, [])
    ).toEqual([])
  })
})

describe('buildQuery', () => {
  const cases: Array<{
    label: string
    keyword: string
    searchIn: string
    allIds: string[]
    personalIds: string[]
    sharedIds: string[]
    expected: string[]
  }> = [
    {
      label: 'includes all calendar ids when searchIn is empty',
      keyword: 'meeting',
      searchIn: '',
      allIds: ALL_IDS,
      personalIds: PERSONAL_IDS,
      sharedIds: SHARED_IDS,
      expected: ALL_IDS
    },
    {
      label: 'filters to personal calendars when searchIn is "my-calendars"',
      keyword: 'meeting',
      searchIn: 'my-calendars',
      allIds: ALL_IDS,
      personalIds: PERSONAL_IDS,
      sharedIds: SHARED_IDS,
      expected: PERSONAL_IDS
    },
    {
      label: 'filters to shared calendars when searchIn is "shared-calendars"',
      keyword: 'standup',
      searchIn: 'shared-calendars',
      allIds: ALL_IDS,
      personalIds: PERSONAL_IDS,
      sharedIds: SHARED_IDS,
      expected: SHARED_IDS
    },
    {
      label:
        'filters to a single calendar when searchIn is a specific calendar id',
      keyword: 'standup',
      searchIn: 'other/cal3',
      allIds: ALL_IDS,
      personalIds: PERSONAL_IDS,
      sharedIds: SHARED_IDS,
      expected: ['other/cal3']
    },
    {
      label:
        'returns an empty searchIn when shared-calendars is selected but sharedIds is empty',
      keyword: 'standup',
      searchIn: 'shared-calendars',
      allIds: PERSONAL_IDS,
      personalIds: PERSONAL_IDS,
      sharedIds: [],
      expected: []
    }
  ]

  it.each(cases)(
    '$label',
    ({ keyword, searchIn, allIds, personalIds, sharedIds, expected }) => {
      const result = buildQuery(
        keyword,
        { ...baseFilters, searchIn },
        allIds,
        personalIds,
        sharedIds
      )
      expect(result?.filters.searchIn).toEqual(expected)
    }
  )
})
