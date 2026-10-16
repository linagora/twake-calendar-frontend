import EventPreviewModal from '@common/components/EventPreview'
import { renderWithProviders } from '../utils/Renderwithproviders'

// The dialog keeps its paper hidden until a dynamic position is found: record
// what the preview asks of it rather than rendering it.
const dialogProps = jest.fn()
jest.mock('@common/components/Dialog/ResponsiveDialog', () => ({
  __esModule: true,
  default: (props: { open: boolean; dynamicPositioning?: boolean }) => {
    dialogProps(props)
    return null
  }
}))

const CAL_ID = '667037022b752d0026472254/cal1'

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
            start: '2025-01-15T10:00:00.000Z',
            end: '2025-01-15T11:00:00.000Z'
          }
        }
      }
    },
    pending: false
  }
}

const renderPreview = (anchorEl: HTMLElement | null): void => {
  renderWithProviders(
    <EventPreviewModal
      open={true}
      onClose={jest.fn()}
      calId={CAL_ID}
      eventId="event1"
      currentView="timeGridWeek"
      anchorEl={anchorEl}
    />,
    preloadedState
  )
}

// The edit, duplicate... dialogs the preview holds are rendered closed
const lastDynamicPositioning = (): boolean | undefined =>
  (
    dialogProps.mock.calls
      .map(call => call[0] as { open: boolean; dynamicPositioning?: boolean })
      .filter(props => props.open)
      .at(-1) ?? {}
  ).dynamicPositioning

describe('EventPreviewModal positioning', () => {
  beforeEach(() => {
    dialogProps.mockClear()
  })

  it('is placed next to the clicked event', () => {
    const clicked = document.createElement('div')
    document.body.appendChild(clicked)

    renderPreview(clicked)

    expect(lastDynamicPositioning()).toBe(true)
  })

  // A deep link opens the preview without a clicked event: placed after
  // whatever event the grid shows, it stayed hidden when the grid showed none.
  it('is centred when opened without an anchor (deep link)', () => {
    renderPreview(null)

    expect(lastDynamicPositioning()).toBe(false)
  })
})
