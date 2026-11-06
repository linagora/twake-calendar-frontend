import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import * as EventDao from '@common/features/Events/EventDao'
import EventUpdateModal from '@common/features/Events/EventUpdateModal'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

vi.mock('@common/features/Events/EventDao')
vi.mock('@common/features/Calendars/CalendarDAO')

const CAL_ID = '667037022b752d0026472254/cal1'

// As the grid holds it after a reload: the REPORT strips the zone, and the
// store falls back on the one of the browser
const event = {
  uid: 'event-1',
  title: 'New York call',
  calId: CAL_ID,
  URL: `/calendars/${CAL_ID}/event-1.ics`,
  start: '2026-11-04T15:00:00Z',
  end: '2026-11-04T16:00:00Z',
  timezone: 'Europe/Paris',
  allday: false,
  organizer: new userOrganiser({ cn: 'test', cal_address: 'test@test.com' }),
  attendee: []
} as unknown as CalendarEvent

const stored = [
  'vcalendar',
  [],
  [
    [
      'vevent',
      [
        ['uid', {}, 'text', 'event-1'],
        [
          'dtstart',
          { tzid: 'America/New_York' },
          'date-time',
          '2026-11-04T10:00:00'
        ],
        [
          'dtend',
          { tzid: 'America/New_York' },
          'date-time',
          '2026-11-04T11:00:00'
        ]
      ],
      []
    ]
  ]
] as unknown as VCalComponent

const preloadedState = {
  user: {
    userData: {
      sub: 'test',
      email: 'test@test.com',
      sid: 'test-sid',
      openpaasId: '667037022b752d0026472254'
    },
    organiserData: new userOrganiser({
      cn: 'test',
      cal_address: 'test@test.com'
    })
  },
  calendars: {
    list: {
      [CAL_ID]: {
        id: CAL_ID,
        name: 'Test Calendar',
        color: '#FF0000',
        events: { 'event-1': event }
      }
    },
    pending: false
  }
}

const renderModal = (): void => {
  renderWithProviders(
    <EventUpdateModal
      open={true}
      onClose={vi.fn()}
      calId={CAL_ID}
      eventId="event-1"
      eventData={event}
    />,
    preloadedState
  )
}

const shownStart = async (): Promise<string> => {
  await waitFor(() =>
    expect(screen.queryByTestId('series-loading')).not.toBeInTheDocument()
  )
  fireEvent.click(screen.getByRole('button', { name: 'common.moreOptions' }))
  return (screen.getByTestId('start-time-input') as HTMLInputElement).value
}

describe('EventUpdateModal of a simple event', () => {
  beforeEach(() => {
    vi.mocked(EventDao.fetchEvent).mockReset()
  })

  it('opens in the zone of the stored object, read once', async () => {
    vi.mocked(EventDao.fetchEvent).mockResolvedValue(stored)

    renderModal()

    expect(screen.getByTestId('series-loading')).toBeInTheDocument()
    expect(await shownStart()).toBe('10:00')
    expect(EventDao.fetchEvent).toHaveBeenCalledTimes(1)
  })

  it('opens from what the grid knows when the read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(EventDao.fetchEvent).mockRejectedValue(new Error('403'))

    renderModal()

    expect(await shownStart()).toBe('16:00')
  })
})
