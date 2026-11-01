/**
 * @jest-environment jsdom
 */
import { buildFromExistingEvent } from './eventInitialValuesHelpers'
import type { CalendarEvent } from '@common/types/EventsTypes'

describe('buildFromExistingEvent', () => {
  it('opens an event whose zone the browser does not know in UTC', () => {
    const event = {
      uid: 'event-1',
      title: 'Review',
      start: '2025-09-15T10:00:00Z',
      end: '2025-09-15T11:00:00Z',
      timezone: 'Mars/Olympus_Mons',
      attendee: []
    } as unknown as CalendarEvent

    expect(
      buildFromExistingEvent({
        event,
        resolvedCalendarTimezone: 'Europe/Paris',
        calList: {},
        userId: 'user',
        defaultCalendarId: 'user/user',
        organizer: undefined
      })
    ).toMatchObject({
      timezone: 'UTC',
      start: '2025-09-15T10:00',
      end: '2025-09-15T11:00'
    })
  })
})
