import type { Mock } from 'vitest'
import { CallbackResume } from '@private/features/User/LoginCallback'
import { completeLogin, LoginRequiredError } from '@linagora/twake-oidc'
import { act, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

// The silent sign in of /embed/newEvent comes back on the callback page, in
// the frame of Twake Chat, before anything is imported
const { postMessage, RETURN_TO } = vi.hoisted(() => {
  const RETURN_TO = '/embed/newEvent?attendee=alice%40example.com'
  window.history.replaceState(
    null,
    '',
    '/callback?error=login_required&state=s'
  )
  sessionStorage.setItem(
    'redirectState',
    JSON.stringify({
      code_verifier: 'v',
      state: 's',
      returnTo: RETURN_TO,
      silent: true
    })
  )
  const postMessage = vi.fn()
  const chat = { postMessage }
  Object.defineProperty(window, 'parent', {
    configurable: true,
    get: () => chat
  })
  return { postMessage, RETURN_TO }
})

vi.mock('@linagora/twake-oidc', async () => ({
  ...(await vi.importActual('@linagora/twake-oidc')),
  completeLogin: vi.fn(),
  startLogin: vi.fn(),
  LoginRequiredError: class extends Error {
    constructor(readonly returnTo: string) {
      super('The SSO needs the user to sign in')
    }
  }
}))

const CHAT = 'https://chat.test'

describe('the silent sign in of the new event form framed by Twake Chat', () => {
  it('tells Twake Chat, once greeted, that the user must sign in', async () => {
    ;(completeLogin as Mock).mockRejectedValue(
      new LoginRequiredError(RETURN_TO)
    )
    renderWithProviders(<CallbackResume />)
    expect(await screen.findByText('embed.signInRequired')).toBeInTheDocument()

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'twake-calendar:hello' },
          origin: CHAT,
          source: window.parent
        })
      )
    })

    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        { type: 'twake-calendar:login-required' },
        CHAT
      )
    )
    // Only the protocol of Twake Chat: this frame is not the one of TwakeSpace
    const types = (postMessage.mock.calls as [{ type: string }][]).map(
      ([data]) => data.type
    )
    expect(types.every(type => type.startsWith('twake-calendar:'))).toBe(true)
  })
})
