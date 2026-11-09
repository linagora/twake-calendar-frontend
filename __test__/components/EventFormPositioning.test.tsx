import EventModal from '@common/features/Events/EventModal'
import EventUpdateModal from '@common/features/Events/EventUpdateModal'
import { DateSelectArg } from '@fullcalendar/core'
import { renderWithProviders } from '../utils/Renderwithproviders'

// The dialog keeps its paper hidden until a dynamic position is found: record
// what each form asks of it rather than rendering it.
const dialogProps = vi.fn()
vi.mock('@common/components/Dialog/ResponsiveDialog', () => ({
  __esModule: true,
  default: (props: { open: boolean; dynamicPositioning?: boolean }) => {
    dialogProps(props)
    return null
  }
}))

const CAL_ID = '667037022b752d0026472254/cal1'
const START = '2025-01-15T10:00:00.000Z'
const END = '2025-01-15T11:00:00.000Z'

const preloadedState = {
  user: {
    userData: {
      sub: 'test',
      email: 'test@test.com',
      openpaasId: '667037022b752d0026472254'
    },
    organiserData: { cn: 'test', cal_address: 'test@test.com' }
  },
  calendars: {
    list: {
      [CAL_ID]: {
        id: CAL_ID,
        name: 'Calendar',
        color: '#FF0000',
        owner: { emails: ['test@test.com'] },
        events: {
          event1: {
            uid: 'event1',
            title: 'Test Event',
            calId: CAL_ID,
            start: START,
            end: END
          }
        }
      }
    },
    pending: false
  }
}

const renderUpdateModal = (anchorEl: HTMLElement | null): void => {
  renderWithProviders(
    <EventUpdateModal
      open={true}
      onClose={vi.fn()}
      eventId="event1"
      calId={CAL_ID}
      currentView="timeGridWeek"
      anchorEl={anchorEl}
    />,
    preloadedState
  )
}

const renderEventModal = (anchorEl: HTMLElement | null): void => {
  renderWithProviders(
    <EventModal
      open={true}
      onClose={vi.fn()}
      selectedRange={
        {
          start: new Date(START),
          startStr: START,
          end: new Date(END),
          endStr: END,
          allDay: false
        } as DateSelectArg
      }
      setSelectedRange={vi.fn()}
      calendarRef={{ current: null }}
      currentView="timeGridWeek"
      anchorEl={anchorEl}
    />,
    preloadedState
  )
}

const lastDynamicPositioning = (): boolean | undefined =>
  (
    dialogProps.mock.calls
      .map(call => call[0] as { open: boolean; dynamicPositioning?: boolean })
      .filter(props => props.open)
      .at(-1) ?? {}
  ).dynamicPositioning

describe('Positioning of the event forms', () => {
  beforeEach(() => {
    dialogProps.mockClear()
  })

  const clickedEvent = (): HTMLElement => {
    const clicked = document.createElement('div')
    document.body.appendChild(clicked)
    return clicked
  }

  it('places the edit form next to the clicked event', () => {
    renderUpdateModal(clickedEvent())

    expect(lastDynamicPositioning()).toBe(true)
  })

  // An event link opens the preview without a clicked event: placed after
  // whatever event the grid shows, the form stayed hidden when it showed none.
  it('centres the edit form opened without an anchor (event link)', () => {
    renderUpdateModal(null)

    expect(lastDynamicPositioning()).toBe(false)
  })

  it('places the duplicate form next to the clicked event', () => {
    renderEventModal(clickedEvent())

    expect(lastDynamicPositioning()).toBe(true)
  })

  it('centres the duplicate form opened without an anchor (event link)', () => {
    renderEventModal(null)

    expect(lastDynamicPositioning()).toBe(false)
  })

  it('centres the form of a new event opened from the page itself', () => {
    renderEventModal(document.body)

    expect(lastDynamicPositioning()).toBe(false)
  })
})
