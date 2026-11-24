import { previewEventIdOf } from '@common/features/Search/previewEventId'
import { SearchEventResult } from '@common/features/Search/types/SearchEventResult'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'

const result = (uid: string, start: string): SearchEventResult =>
  ({
    data: { uid, start },
    _links: { self: { href: `/calendars/user1/cal1/${uid}.ics` } }
  }) as unknown as SearchEventResult

const calendarWith = (
  events: Record<string, Partial<CalendarEvent>>
): Calendar => ({ id: 'user1/cal1', events }) as unknown as Calendar

describe('previewEventIdOf (#2204)', () => {
  it('previews the event stored under the plain uid', () => {
    const calendar = calendarWith({
      single: { uid: 'single', start: '2026-11-24T10:00:00Z' }
    })

    expect(
      previewEventIdOf(calendar, result('single', '2026-11-24T10:00:00Z'))
    ).toBe('single')
  })

  it('previews the loaded occurrence starting with the result of a series', () => {
    const calendar = calendarWith({
      'series/2026-12-01T10:00:00Z': {
        uid: 'series/2026-12-01T10:00:00Z',
        start: '2026-12-01T10:00:00Z'
      },
      'series/2026-11-24T10:00:00Z': {
        uid: 'series/2026-11-24T10:00:00Z',
        start: '2026-11-24T10:00:00Z'
      }
    })

    expect(
      previewEventIdOf(calendar, result('series', '2026-11-24T10:00:00Z'))
    ).toBe('series/2026-11-24T10:00:00Z')
  })

  it('falls back to the first loaded occurrence when none starts with the result', () => {
    const calendar = calendarWith({
      'series/2026-12-04T10:00:00Z': {
        uid: 'series/2026-12-04T10:00:00Z',
        start: '2026-12-04T10:00:00Z'
      },
      'series/2026-12-01T10:00:00Z': {
        uid: 'series/2026-12-01T10:00:00Z',
        start: '2026-12-01T10:00:00Z'
      },
      other: { uid: 'other', start: '2026-11-30T10:00:00Z' }
    })

    expect(
      previewEventIdOf(calendar, result('series', '2026-12-02T10:00:00Z'))
    ).toBe('series/2026-12-01T10:00:00Z')
  })

  it('previews nothing while the event is not loaded', () => {
    const calendar = calendarWith({
      other: { uid: 'other', start: '2026-11-30T10:00:00Z' }
    })

    expect(
      previewEventIdOf(calendar, result('series', '2026-11-24T10:00:00Z'))
    ).toBeUndefined()
    expect(
      previewEventIdOf(undefined, result('series', '2026-11-24T10:00:00Z'))
    ).toBeUndefined()
  })
})
