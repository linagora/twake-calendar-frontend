// First: the mocks of the harness must be in place when the app loads
import {
  CAL_ID,
  CARD,
  EVENT_UID,
  MY_CALENDAR,
  NEXT_WEEK,
  USER_ID,
  answerHandshake,
  calendarObject,
  fakeTodayBeforeTheMeetings,
  findPreview,
  resetServers,
  serve,
  settle,
  signedInStore,
  userReplyIn,
  writes,
  written
} from './openEventIntentHarness'
import { IntentsApp } from '@private/IntentsApp'
import { render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'

// CodeRabbit on PR #2218 (OpenEventIntentPage, the reply to a whole series):
// the event Twake Chat opens is found in a calendar Alice delegated to the
// user, and both are invited. The reply OPEN sends is the user's, the
// attendee whose row the page checked, never Alice's; and none goes out
// when the delegation does not let the user write.
const ALICE = 'alice@example.com'
const SHARED = 'shared-alice'
const delegatedCalendar = (write: boolean): Record<string, unknown> => ({
  id: 'alice-id/alice-cal',
  name: "Alice's calendar",
  // The user's own instance of the calendar, in their home
  link: `/calendars/${USER_ID}/${SHARED}.json`,
  delegated: true,
  access: {
    freebusy: true,
    read: true,
    write,
    'write-properties': write,
    all: false
  },
  owner: { emails: [ALICE] },
  color: { light: '#00FF00', dark: '#000' },
  events: {}
})

const openIntentWith = (write: boolean): void => {
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  render(
    <Provider
      store={signedInStore({
        [CAL_ID]: MY_CALENDAR,
        'alice-id/alice-cal': delegatedCalendar(write)
      })}
    >
      <IntentsApp />
    </Provider>
  )
}

const inSharedCalendar = {
  href: `/calendars/${USER_ID}/${SHARED}/${EVENT_UID}.ics`
}

describe('the event Twake Chat opens, found in a calendar delegated to the user', () => {
  beforeEach(resetServers)
  fakeTodayBeforeTheMeetings()

  // The user is invited to one occurrence: the reply goes through the path
  // of a whole series, which picks whose row it writes
  it('sends the reply asked as the reply of the user, not of the owner of the calendar, for an occurrence', async () => {
    serve(
      calendarObject(
        { isSeries: true, user: null, others: [[ALICE, 'NEEDS-ACTION']] },
        { recurrenceId: NEXT_WEEK, others: [[ALICE, 'NEEDS-ACTION']] }
      ),
      inSharedCalendar
    )
    openIntentWith(true)
    await answerHandshake({
      uid: EVENT_UID,
      partstat: 'ACCEPTED',
      expected: { ...CARD, start: NEXT_WEEK }
    })

    await findPreview()
    await waitFor(() => expect(written().length).toBeGreaterThan(0))
    await settle()
    const last = written().slice(-1)[0]
    expect(userReplyIn(last, NEXT_WEEK)).toBe('ACCEPTED')
    expect(userReplyIn(last, NEXT_WEEK, ALICE)).toBe('NEEDS-ACTION')
  })

  it.each([
    ['an event', calendarObject({ others: [[ALICE, 'NEEDS-ACTION']] })],
    [
      'a whole series',
      calendarObject({ isSeries: true, others: [[ALICE, 'NEEDS-ACTION']] })
    ]
  ])(
    'sends no reply at once when the delegation is read only (%s)',
    async (_, stored) => {
      serve(stored, inSharedCalendar)
      openIntentWith(false)
      await answerHandshake({
        uid: EVENT_UID,
        partstat: 'ACCEPTED',
        expected: CARD
      })

      await findPreview()
      await settle()
      expect(writes()).toEqual([])
    }
  )
})
