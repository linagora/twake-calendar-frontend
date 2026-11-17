import type { Mock } from 'vitest'
import { api } from '@common/utils/apiUtils'
import { fetchEvent } from '@public/features/EventPreview/EventDao'

vi.mock('@common/utils/apiUtils', () => ({
  api: { get: vi.fn() }
}))

const mockGet = api.get as unknown as Mock

describe('fetchEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
  })

  test('sends the action of the link beside the token', async () => {
    await fetchEvent('a.b+c/d', 'TENTATIVE')

    expect(mockGet).toHaveBeenCalledWith(
      'calendar/api/calendars/event/participation?jwt=a.b%2Bc%2Fd&action=TENTATIVE'
    )
  })

  test('sends the token alone when the link has no action', async () => {
    await fetchEvent('a.b.c')

    expect(mockGet).toHaveBeenCalledWith(
      'calendar/api/calendars/event/participation?jwt=a.b.c'
    )
  })
})
