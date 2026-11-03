import { setupStore } from '@common/app/store'
import * as UserDao from '@common/features/User/UserDao'
import { updateUserConfigurations } from '@common/features/User/UserSlice'

describe('updateUserConfigurations', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('applies the saved changes', async () => {
    vi.spyOn(UserDao, 'patchConfigurations').mockResolvedValue(undefined)
    const store = setupStore()

    await store.dispatch(updateUserConfigurations({ language: 'fr' }))

    expect(store.getState().user.coreConfig.language).toBe('fr')
    expect(store.getState().user.error).toBeNull()
  })

  it('keeps a failed save out of the fatal user error (#1716)', async () => {
    vi.spyOn(UserDao, 'patchConfigurations').mockRejectedValue(
      new Error('Request failed with status code 500')
    )
    const store = setupStore()
    const languageBefore = store.getState().user.coreConfig.language

    const result = await store.dispatch(
      updateUserConfigurations({ language: 'fr' })
    )

    expect(result.type).toBe(updateUserConfigurations.rejected.type)
    expect(store.getState().user.error).toBeNull()
    expect(store.getState().user.coreConfig.language).toBe(languageBefore)
  })
})
