/**
 * @jest-environment jsdom
 */
import userReducer, { setUserData } from '@common/features/User/UserSlice'
import { userData, userOrganiser } from '@common/features/User/userDataTypes'

/**
 * Regression coverage for #1095: a new-event create failed with
 * "e.organizer.asJcal is not a function" because state.user.organiserData was a
 * plain object instead of a userOrganiser instance. The slice must always
 * expose organiserData as a full-fledged userOrganiser so consumers can call
 * its methods.
 */
describe('UserSlice – organiserData is a userOrganiser instance (#1095)', () => {
  const baseUser: userData = {
    email: 'alice@example.com',
    family_name: 'Doe',
    given_name: 'Alice',
    name: 'Alice Doe',
    sid: 'sid-1',
    sub: 'alice'
  }

  it('exposes a userOrganiser instance in the initial state', () => {
    const state = userReducer(undefined, { type: '@@INIT' })
    expect(state.organiserData).toBeInstanceOf(userOrganiser)
  })

  it('setUserData stores a userOrganiser instance with a working asJcal()', () => {
    const state = userReducer(undefined, setUserData(baseUser))
    expect(state.organiserData).toBeInstanceOf(userOrganiser)
    expect(() => state.organiserData.asJcal()).not.toThrow()
    const jcal = state.organiserData.asJcal()
    expect(jcal[3]).toBe('mailto:alice@example.com')
    expect((jcal[1] as Record<string, string>).cn).toBe('alice')
  })
})
