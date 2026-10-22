import { setupStore } from '@common/app/store'
import { usePlatformSignIn } from '@common/hooks/usePlatformSignIn'
import { renderHook } from '@testing-library/react'
import React, { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'

const mockEnsureSdkSignedIn = jest.fn()

jest.mock('@common/utils/sdkSession', () => ({
  ensureSdkSignedIn: (...args: unknown[]): unknown =>
    mockEnsureSdkSignedIn(...args)
}))

const renderSignIn = ({
  idToken = 'user-id-token',
  workplaceFqdn = 'alice.example.com'
}: { idToken?: string; workplaceFqdn?: string } = {}): void => {
  const store = setupStore({
    user: {
      userData: { email: 'alice@example.com', workplaceFqdn },
      organiserData: {},
      tokens: idToken ? { id_token: idToken } : {}
    }
  })
  renderHook(() => usePlatformSignIn(), {
    wrapper: ({ children }: PropsWithChildren) =>
      React.createElement(Provider, { store }, children)
  })
}

describe('usePlatformSignIn', () => {
  beforeEach(() => {
    mockEnsureSdkSignedIn.mockReset()
    mockEnsureSdkSignedIn.mockResolvedValue({})
  })

  it("signs the user's platform session in with their id token", () => {
    renderSignIn()

    expect(mockEnsureSdkSignedIn).toHaveBeenCalledWith(
      'https://alice.example.com',
      'user-id-token'
    )
  })

  it("does nothing without the user's platform", () => {
    renderSignIn({ workplaceFqdn: '' })

    expect(mockEnsureSdkSignedIn).not.toHaveBeenCalled()
  })

  it('waits for the id token', () => {
    renderSignIn({ idToken: '' })

    expect(mockEnsureSdkSignedIn).not.toHaveBeenCalled()
  })
})
