import { createVideoConference } from '@common/features/Events/VideoConferenceDao'
import { api } from '@common/utils/apiUtils'
import { HTTPError } from 'ky'

jest.mock('@common/utils/apiUtils')

const mockedApi = api as jest.Mocked<typeof api>

function jsonResponse(body: unknown): { json: () => Promise<unknown> } {
  return { json: () => Promise.resolve(body) }
}

/**
 * Built from plain objects rather than `new Response(...)`: jsdom provides
 * neither `Response` nor `Request`, and ky's constructor only reads
 * `status`, `statusText`, `method` and `url` to compose its message.
 */
function httpError(status: number): HTTPError {
  return new HTTPError(
    { status, statusText: '' } as Response,
    {
      method: 'POST',
      url: 'https://example.test/api/videoconference'
    } as Request,
    {} as never
  )
}

describe('createVideoConference', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns the link the server minted', async () => {
    mockedApi.post = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ url: 'https://meet.example.test/pkp-cmre-umg' })
      ) as never

    await expect(createVideoConference()).resolves.toBe(
      'https://meet.example.test/pkp-cmre-umg'
    )
    expect(mockedApi.post).toHaveBeenCalledWith('api/videoconference')
  })

  // The deployment-does-not-mint-rooms case. It has to be distinguishable from
  // a failure: the caller falls back to generating a link locally, which is
  // exactly what those deployments expect.
  it('returns null when the route is absent', async () => {
    mockedApi.post = jest.fn().mockRejectedValue(httpError(404)) as never

    await expect(createVideoConference()).resolves.toBeNull()
  })

  // The other polarity of the same branch. Without it, a DAO that swallowed
  // every HTTP error would pass the test above just as well — and a
  // conferencing backend that is down would look like a deployment that never
  // had one.
  it('rethrows any other HTTP failure', async () => {
    mockedApi.post = jest.fn().mockRejectedValue(httpError(502)) as never

    await expect(createVideoConference()).rejects.toBeInstanceOf(HTTPError)
  })

  it('rejects a room that comes back without a link', async () => {
    // An empty href in an invitation reads as a broken product rather than a
    // broken deployment, so this must be loud.
    mockedApi.post = jest
      .fn()
      .mockResolvedValue(jsonResponse({ slug: 'pkp-cmre-umg' })) as never

    await expect(createVideoConference()).rejects.toThrow('no url')
  })
})
