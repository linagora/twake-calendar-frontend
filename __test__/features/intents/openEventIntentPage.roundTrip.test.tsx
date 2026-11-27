// First: the mocks of the harness must be in place when the app loads
import {
  EVENT_UID,
  MY_CALENDAR,
  NOTICE,
  answerHandshake,
  fakeTodayBeforeTheMeetings,
  findPreview,
  repliesWritten,
  resetServers,
  serve,
  signedInStore,
  storedEvent
} from './openEventIntentHarness'
import type { Mock } from 'vitest'
import { DEFAULT_FORM_VALUES } from '@common/components/Event/EventFormFields.types'
import { fetchEventByUid } from '@common/features/Calendars/CalendarDAO'
import type { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { buildNewEvent } from '@common/features/Events/hooks/submitCreateHelpers/createAction'
import { createdEvent } from '@common/features/intents/newEventIntent'
import type { Calendar } from '@common/types/CalendarTypes'
import { IntentsApp } from '@private/IntentsApp'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'

// Twake Chat makes a meeting with the CREATE intent, shows its card, then
// opens it with OPEN, sending back the very `start` CREATE gave it
// (CreatedEvent.start) as `expected.start`. Whatever the form saved, a timed
// event in any zone or an all-day one, OPEN must take that start: never fail
// it as data of another shape (CodeRabbit CR3 on PR #2218).

// The start CREATE gives back for the event the form saves with these values
const startCreateGivesBack = (form: {
  start: string
  end: string
  allday: boolean
  timezone: string
}): string =>
  createdEvent(
    buildNewEvent({
      values: { ...DEFAULT_FORM_VALUES, title: 'Weekly sync', ...form },
      targetCalendar: MY_CALENDAR as unknown as Calendar,
      showMore: false,
      newEventUID: EVENT_UID
    })
  ).start

// The meeting of the harness (23 November 2026, 10:00 UTC) as an all-day
// event of that day, as the server keeps it
const allDayMeeting = (): VCalComponent => {
  const stored = storedEvent()
  const vevent = (stored[2] as VCalComponent[])[0] as unknown as [
    string,
    unknown[][],
    unknown[]
  ]
  vevent[1] = vevent[1].map(prop =>
    prop[0] === 'dtstart'
      ? ['dtstart', {}, 'date', '2026-11-23']
      : prop[0] === 'dtend'
        ? ['dtend', {}, 'date', '2026-11-24']
        : prop
  )
  return stored
}

const openIntent = (): void => {
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  render(
    <Provider store={signedInStore()}>
      <IntentsApp />
    </Provider>
  )
}

describe('the event Twake Chat made with CREATE, opened with OPEN', () => {
  beforeEach(resetServers)
  fakeTodayBeforeTheMeetings()

  it.each([
    [
      'a timed event in UTC',
      { start: '2026-11-23T10:00', end: '2026-11-23T10:30', tz: 'Etc/UTC' }
    ],
    [
      'a timed event in Paris',
      { start: '2026-11-23T11:00', end: '2026-11-23T11:30', tz: 'Europe/Paris' }
    ],
    [
      'a timed event in New York',
      {
        start: '2026-11-23T05:00',
        end: '2026-11-23T05:30',
        tz: 'America/New_York'
      }
    ],
    [
      'a timed event in a zone half an hour off (Kolkata)',
      { start: '2026-11-23T15:30', end: '2026-11-23T16:00', tz: 'Asia/Kolkata' }
    ],
    [
      'a timed event with no zone in the form',
      { start: '2026-11-23T10:00', end: '2026-11-23T10:30', tz: '' }
    ]
  ])(
    'finds %s by the start CREATE gave back, and sends the reply asked at once',
    async (_, { start, end, tz }) => {
      const created = startCreateGivesBack({
        start,
        end,
        allday: false,
        timezone: tz
      })
      openIntent()
      await answerHandshake({
        uid: EVENT_UID,
        partstat: 'ACCEPTED',
        expected: { title: 'Weekly sync', start: created }
      })

      await findPreview()
      expect(fetchEventByUid as Mock).toHaveBeenCalled()
      await waitFor(() => expect(repliesWritten()).toEqual(['ACCEPTED']))
      expect(screen.queryByText(NOTICE)).toBeNull()
    }
  )

  it.each([
    ['in UTC', 'Etc/UTC'],
    ['in Paris', 'Europe/Paris'],
    ['in New York', 'America/New_York']
  ])(
    'finds an all-day event made %s by the start CREATE gave back, and sends the reply asked at once',
    async (_, tz) => {
      serve(allDayMeeting())
      const created = startCreateGivesBack({
        start: '2026-11-23',
        end: '2026-11-23',
        allday: true,
        timezone: tz
      })
      openIntent()
      await answerHandshake({
        uid: EVENT_UID,
        partstat: 'ACCEPTED',
        expected: { title: 'Weekly sync', start: created }
      })

      await findPreview()
      expect(fetchEventByUid as Mock).toHaveBeenCalled()
      await waitFor(() => expect(repliesWritten()).toEqual(['ACCEPTED']))
      expect(screen.queryByText(NOTICE)).toBeNull()
    }
  )
})
