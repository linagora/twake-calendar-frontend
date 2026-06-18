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
  it('includes all calendar ids when searchIn is empty', () => {
    const result = buildQuery(
      'meeting',
      baseFilters,
      ALL_IDS,
      PERSONAL_IDS,
      SHARED_IDS
    )
    expect(result?.filters.searchIn).toEqual(ALL_IDS)
  })

  it('filters to personal calendars when searchIn is "my-calendars"', () => {
    const result = buildQuery(
      'meeting',
      { ...baseFilters, searchIn: 'my-calendars' },
      ALL_IDS,
      PERSONAL_IDS,
      SHARED_IDS
    )
    expect(result?.filters.searchIn).toEqual(PERSONAL_IDS)
  })

  it('filters to shared calendars when searchIn is "shared-calendars"', () => {
    const result = buildQuery(
      'standup',
      { ...baseFilters, searchIn: 'shared-calendars' },
      ALL_IDS,
      PERSONAL_IDS,
      SHARED_IDS
    )
    expect(result?.filters.searchIn).toEqual(SHARED_IDS)
  })

  it('filters to a single calendar when searchIn is a specific calendar id', () => {
    const result = buildQuery(
      'standup',
      { ...baseFilters, searchIn: 'other/cal3' },
      ALL_IDS,
      PERSONAL_IDS,
      SHARED_IDS
    )
    expect(result?.filters.searchIn).toEqual(['other/cal3'])
  })

  it('returns an empty searchIn when shared-calendars is selected but sharedIds is empty', () => {
    const result = buildQuery(
      'standup',
      { ...baseFilters, searchIn: 'shared-calendars' },
      PERSONAL_IDS,
      PERSONAL_IDS,
      []
    )
    expect(result?.filters.searchIn).toEqual([])
  })
})
