/**
 * @vitest-environment jsdom
 */

import type { Mock } from 'vitest'
import { createVideoConferenceRoom } from '@common/features/Events/VideoConferenceDao'
import { api } from '@common/utils/apiUtils'

vi.mock('@common/utils/apiUtils')

describe('createVideoConferenceRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the URL of the room created by the side service', async () => {
    ;(api.post as Mock).mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        url: 'https://meet.example.com/vep-txbc-trh'
      })
    })

    const result = await createVideoConferenceRoom()

    expect(api.post).toHaveBeenCalledWith('api/videoconference', {
      throwHttpErrors: false
    })
    expect(result).toBe('https://meet.example.com/vep-txbc-trh')
  })

  it('returns null when Meet is not configured', async () => {
    ;(api.post as Mock).mockResolvedValue({ ok: false, status: 404 })

    await expect(createVideoConferenceRoom()).resolves.toBeNull()
  })

  it('throws when Meet refuses to create the room', async () => {
    ;(api.post as Mock).mockResolvedValue({ ok: false, status: 502 })

    await expect(createVideoConferenceRoom()).rejects.toThrow(
      'createVideoConferenceRoom failed with status 502'
    )
  })
})
