import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import { IntentDayView } from '@private/features/Intents/IntentDayView'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { makeIntentService } from '../../utils/makeIntentService'

const mockGotoDate = jest.fn()
const mockControllerProps = jest.fn()

jest.mock('@private/components/Calendar/CalendarController', () => ({
  __esModule: true,
  default: (props: { calendarRef: { current: unknown } }) => {
    props.calendarRef.current = { gotoDate: mockGotoDate }
    mockControllerProps(props)
    return <div data-testid="calendar-controller" />
  }
}))

jest.mock(
  '@private/components/Calendar/hooks/useManageCalendarSelection',
  () => ({
    useManageCalendarSelection: () => ({
      selectedCalendars: [],
      setSelectedCalendars: jest.fn(),
      tempUsers: [],
      setTempUsers: jest.fn(),
      selectedMiniDate: null,
      setSelectedMiniDate: jest.fn()
    })
  })
)

jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

describe('IntentDayView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows the requested day and tells the caller it is ready', () => {
    const service = makeIntentService()

    render(<IntentDayView service={service} data={{ date: '2026-10-03' }} />)

    expect(screen.queryByTestId('calendar-controller')).toBeInTheDocument()
    expect(mockControllerProps).toHaveBeenCalledWith(
      expect.objectContaining({ currentView: CALENDAR_VIEWS.timeGridDay })
    )
    expect(mockGotoDate).toHaveBeenCalledWith(new Date(2026, 9, 3))
    expect(service.notifyReadyToUse).toHaveBeenCalledTimes(1)
  })

  it('fails the intent on an impossible date', () => {
    const service = makeIntentService()

    render(<IntentDayView service={service} data={{ date: '2026-02-31' }} />)

    expect(service.throw).toHaveBeenCalledWith(expect.any(Error))
    expect(screen.queryByTestId('calendar-controller')).toBe(null)
    expect(screen.queryByTestId('intent-message')).toHaveTextContent(
      'intents.error.invalidData'
    )
  })

  it('closes the intent without any result, once', () => {
    const service = makeIntentService()
    render(<IntentDayView service={service} data={{ date: '2026-10-03' }} />)

    fireEvent.click(screen.getByTestId('intent-close'))
    fireEvent.click(screen.getByTestId('intent-close'))

    expect(service.terminate).toHaveBeenCalledTimes(1)
    expect(service.terminate).toHaveBeenCalledWith(null)
  })

  it('notifies the caller once under React strict mode', () => {
    const service = makeIntentService()

    render(
      <React.StrictMode>
        <IntentDayView service={service} data={{ date: '2026-10-03' }} />
      </React.StrictMode>
    )

    expect(service.notifyReadyToUse).toHaveBeenCalledTimes(1)
  })
})
