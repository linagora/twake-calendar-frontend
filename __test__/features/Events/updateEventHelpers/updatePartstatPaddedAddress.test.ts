import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { updateEventPartstatJCal } from '@common/features/Events/transformers/updateEventPartstatJCal'
import { updateSeriesPartstatJCal } from '@common/features/Events/transformers/updateSeriesPartstatJCal'
import { CalendarEvent } from '@common/types/EventsTypes'

/**
 * Regression for #1886: the "all the events" and the single-occurrence RSVP
 * writers must agree on which ATTENDEE is the user, even when the organizer's
 * client pads the cal-address with spaces.
 */
describe('RSVP writers on a padded ATTENDEE address (#1886)', () => {
  const baseEvent: CalendarEvent = {
    URL: '/calendars/cal-1/event-1.ics',
    calId: 'cal-1',
    uid: 'e1',
    start: '2025-03-17T09:00:00.000Z',
    end: '2025-03-17T10:00:00.000Z',
    timezone: 'UTC',
    attendee: []
  }
  const fixedNow = new Date('2025-01-01T00:00:00.000Z').getTime()

  const veventWith = (address: string): VCalComponent => [
    'vevent',
    [
      ['uid', {}, 'text', 'e1'],
      ['dtstart', {}, 'date-time', '2025-03-17T09:00:00Z'],
      ['attendee', { partstat: 'NEEDS-ACTION' }, 'cal-address', address]
    ],
    []
  ]

  const matchUser = (_params: Record<string, string>, calAddress: string) =>
    calAddress.toLowerCase() === 'user@example.com'

  it.each([
    'mailto: user@example.com',
    ' mailto:user@example.com',
    'mailto:user@example.com ',
    'MAILTO:User@Example.com'
  ])('both RSVP paths find the user in %j', address => {
    const series = updateSeriesPartstatJCal(
      [veventWith(address)],
      baseEvent,
      'user@example.com',
      'ACCEPTED',
      fixedNow
    )
    const solo = updateEventPartstatJCal(
      ['vcalendar', [], [veventWith(address)]],
      matchUser,
      'ACCEPTED'
    )

    expect(series[2][0][1][2][1].partstat).toBe('ACCEPTED')
    expect(solo).not.toBeNull()
    expect(solo![2][0][1][2][1].partstat).toBe('ACCEPTED')
    expect(solo![2][0][1][2][3]).toBe(address)
  })

  it('still does not match another attendee', () => {
    const solo = updateEventPartstatJCal(
      ['vcalendar', [], [veventWith('mailto: other@example.com')]],
      matchUser,
      'ACCEPTED'
    )

    expect(solo).toBeNull()
  })
})
