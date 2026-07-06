import { useOpenNewEventFromUrl } from '@common/components/Calendar/hooks/useOpenNewEventFromUrl'
import { PENDING_NEW_EVENT_ATTENDEES_KEY } from '@common/features/Events/newEventDeepLinkUtils'
import { userAttendee } from '@common/features/User/models/attendee'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { renderHook } from '@testing-library/react'

const cal = { id: 'u1/u1' } as unknown as Calendar

const renderWith = ({
  userId = 'u1',
  calendars = { 'u1/u1': cal }
}: {
  userId?: string
  calendars?: Record<string, Calendar>
} = {}): { setTempEvent: jest.Mock; setAnchorEl: jest.Mock } => {
  const setTempEvent = jest.fn()
  const setAnchorEl = jest.fn()
  renderHook(() =>
    useOpenNewEventFromUrl({ userId, calendars, setTempEvent, setAnchorEl })
  )
  return { setTempEvent, setAnchorEl }
}

describe('useOpenNewEventFromUrl', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('opens the create modal with the pending attendees prefilled', () => {
    sessionStorage.setItem(
      PENDING_NEW_EVENT_ATTENDEES_KEY,
      JSON.stringify(['xxx@yyy.com'])
    )

    const { setTempEvent, setAnchorEl } = renderWith()

    expect(setTempEvent).toHaveBeenCalledTimes(1)
    const tempEvent = setTempEvent.mock.calls[0][0] as CalendarEvent
    expect(tempEvent.attendee).toHaveLength(1)
    expect(tempEvent.attendee?.[0]).toBeInstanceOf(userAttendee)
    expect(tempEvent.attendee?.[0].cal_address).toBe('xxx@yyy.com')
    expect(setAnchorEl).toHaveBeenCalledWith(document.body)
    expect(sessionStorage.getItem(PENDING_NEW_EVENT_ATTENDEES_KEY)).toBeNull()
  })

  it('does nothing when there is no pending attendee', () => {
    const { setTempEvent, setAnchorEl } = renderWith()

    expect(setTempEvent).not.toHaveBeenCalled()
    expect(setAnchorEl).not.toHaveBeenCalled()
  })

  it('waits for the user id before opening the modal', () => {
    sessionStorage.setItem(
      PENDING_NEW_EVENT_ATTENDEES_KEY,
      JSON.stringify(['xxx@yyy.com'])
    )

    const { setTempEvent, setAnchorEl } = renderWith({ userId: '' })

    expect(setTempEvent).not.toHaveBeenCalled()
    expect(setAnchorEl).not.toHaveBeenCalled()
    expect(
      sessionStorage.getItem(PENDING_NEW_EVENT_ATTENDEES_KEY)
    ).not.toBeNull()
  })

  it('waits for the calendars to be loaded before opening the modal', () => {
    sessionStorage.setItem(
      PENDING_NEW_EVENT_ATTENDEES_KEY,
      JSON.stringify(['xxx@yyy.com'])
    )

    const { setTempEvent, setAnchorEl } = renderWith({ calendars: {} })

    expect(setTempEvent).not.toHaveBeenCalled()
    expect(setAnchorEl).not.toHaveBeenCalled()
    expect(
      sessionStorage.getItem(PENDING_NEW_EVENT_ATTENDEES_KEY)
    ).not.toBeNull()
  })
})
