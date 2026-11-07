import { setupStore } from '@common/app/store'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { redirectTo } from '@common/utils/navigation'
import App from '@private/App'
import { render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'

// The calendar is open in its own tab, not framed by anyone
vi.hoisted(() => {
  window.history.replaceState(null, '', '/calendar')
})

// See embeddedNewEvent.test.tsx: the router of the routes of the app
vi.mock('redux-first-history/rr6', async () => ({
  HistoryRouter: (await import('react-router')).unstable_HistoryRouter
}))
vi.mock('@common/utils/apiUtils')
vi.mock('@common/useScreenSizeDetection', () => ({
  useScreenSizeDetection: vi.fn(() => ({ isTooSmall: false, isTablet: false }))
}))
// jsdom cannot leave the page: where the app would go instead
vi.mock('@common/utils/navigation', () => ({ redirectTo: vi.fn() }))

const USER_ID = '667037022b752d0026472254'

describe('the session ended in another tab', () => {
  it('sends the calendar back to the login', async () => {
    const initial = setupStore().getState()
    const store = setupStore({
      ...initial,
      user: {
        ...initial.user,
        userData: { sub: 'test', email: 'test@test.com', openpaasId: USER_ID },
        tokens: { access_token: 'token' },
        organiserData: new userOrganiser({
          cn: 'test',
          cal_address: 'test@test.com'
        })
      },
      calendars: { ...initial.calendars, pending: false, list: {} }
    } as Parameters<typeof setupStore>[0])
    render(
      <Provider store={store}>
        <App />
      </Provider>
    )

    const otherTab = new BroadcastChannel('twake-oidc-session')
    otherTab.postMessage({ type: 'session-ended', senderId: 'another-tab' })
    otherTab.close()

    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith('/'))
  })
})
