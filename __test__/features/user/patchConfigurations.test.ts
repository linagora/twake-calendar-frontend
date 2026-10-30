/**
 * @vitest-environment jsdom
 */
import type { MockInstance } from 'vitest'
import { patchConfigurations } from '@common/features/User/UserDao'
import { ModuleConfiguration } from '@common/features/User/userDataTypes'
import { api } from '@common/utils/apiUtils'
import { waitFor } from '@testing-library/react'

vi.mock('@common/utils/apiUtils')

const configurationNamed = (name: string): ModuleConfiguration[] => [
  { name: 'core', configurations: [{ name, value: name }] }
]

describe('patchConfigurations', () => {
  let apiPatchSpy: MockInstance

  beforeEach(() => {
    apiPatchSpy = vi.spyOn(api, 'patch')
  })

  afterEach(() => {
    apiPatchSpy.mockRestore()
  })

  it('holds a write back until the one issued before it answered', async () => {
    const answered: string[] = []
    const pending: Array<() => void> = []
    apiPatchSpy.mockImplementation(
      (_url: string, options: { json: ModuleConfiguration[] }) =>
        new Promise(resolve => {
          const { name } = options.json[0].configurations[0]
          pending.push(() => {
            answered.push(name)
            resolve({ status: 204 })
          })
        })
    )

    const detection = patchConfigurations(configurationNamed('datetime'))
    const click = patchConfigurations(configurationNamed('language'))

    await waitFor(() => expect(apiPatchSpy).toHaveBeenCalled())
    // The second write waits on the first: reaching the backend in the wrong
    // order would leave it holding the choice the user made first.
    expect(apiPatchSpy).toHaveBeenCalledTimes(1)

    pending[0]()
    await detection
    await waitFor(() => expect(apiPatchSpy).toHaveBeenCalledTimes(2))

    pending[1]()
    await click

    expect(answered).toEqual(['datetime', 'language'])
  })

  it('lets the next write through once one failed', async () => {
    apiPatchSpy
      .mockRejectedValueOnce(new Error('the backend said no'))
      .mockResolvedValueOnce({ status: 204 })

    await expect(
      patchConfigurations(configurationNamed('datetime'))
    ).rejects.toThrow('the backend said no')
    await expect(
      patchConfigurations(configurationNamed('language'))
    ).resolves.toEqual({ status: 204 })
  })
})
