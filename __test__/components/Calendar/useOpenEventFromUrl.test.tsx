import { useOpenEventFromUrl } from '@common/components/Calendar/hooks/useOpenEventFromUrl'
import { PENDING_EVENT_UID_KEY } from '@common/features/Events/eventDeepLinkUtils'
import type { AppDispatch } from '@common/app/store'
import type { Calendar } from '@common/types/CalendarTypes'
import { renderHook, waitFor } from '@testing-library/react'

const calendars = {
  'team1/team1': { id: 'team1/team1' },
  'alice/alice': { id: 'alice/alice' }
} as unknown as Record<string, Calendar>

const setup = (
  uid: string | null,
  { calId, foundIn = 'team1/team1' }: { calId?: string; foundIn?: string } = {}
) => {
  const dispatch = vi.fn((thunk: unknown) => {
    void thunk
    return {
      unwrap: () => Promise.resolve({ calId: foundIn, events: [{ uid: 'e1' }] })
    }
  }) as unknown as AppDispatch
  const setOpenEventDisplay = vi.fn()
  const setEventDisplayedId = vi.fn()
  const hook = renderHook(
    ({ uid }: { uid: string | null }) =>
      useOpenEventFromUrl({
        userId: 'user1',
        calendars,
        dispatch,
        setEventDisplayedId,
        setEventDisplayedCalId: vi.fn(),
        setEventDisplayedTemp: vi.fn(),
        setOpenEventDisplay,
        uid,
        calId
      }),
    { initialProps: { uid } }
  )
  return { ...hook, dispatch, setOpenEventDisplay, setEventDisplayedId }
}

describe('useOpenEventFromUrl on the embed route', () => {
  afterEach(() => sessionStorage.clear())

  it('opens the event of the route, not the one a deep link saved', async () => {
    sessionStorage.setItem(PENDING_EVENT_UID_KEY, 'other')
    const { setOpenEventDisplay, setEventDisplayedId } = setup('e1')

    await waitFor(() => expect(setOpenEventDisplay).toHaveBeenCalledWith(true))
    expect(setEventDisplayedId).toHaveBeenCalledWith('e1')
    expect(sessionStorage.getItem(PENDING_EVENT_UID_KEY)).toBe('other')
  })

  it('opens the same event again once the route left it', async () => {
    const { rerender, dispatch } = setup('e1')
    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1))

    rerender({ uid: 'e1' })
    expect(dispatch).toHaveBeenCalledTimes(1)

    rerender({ uid: null })
    rerender({ uid: 'e1' })
    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(2))
  })

  it('does not open an event of another calendar', async () => {
    const { dispatch, setOpenEventDisplay } = setup('e1', {
      calId: 'team1/team1',
      foundIn: 'alice/alice'
    })

    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(setOpenEventDisplay).not.toHaveBeenCalled()
  })

  it('leaves the deep link of the full page alone on the bare route', async () => {
    sessionStorage.setItem(PENDING_EVENT_UID_KEY, 'other')
    const { dispatch } = setup(null)

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(dispatch).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(PENDING_EVENT_UID_KEY)).toBe('other')
  })
})
