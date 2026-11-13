import {
  toAttachmentUploadFailure,
  UPLOAD_TIMEOUT_MS,
  uploadAttachment
} from '@common/features/Tdrive/AttachmentDao'
import { api } from '@common/utils/apiUtils'
import { HTTPError, TimeoutError } from 'ky'

vi.mock('@common/utils/apiUtils', () => ({
  api: { post: vi.fn() }
}))

const mockPost = api.post as unknown as ReturnType<typeof vi.fn>

const httpError = (status: number): HTTPError =>
  new HTTPError(
    new Response(null, { status }),
    new Request('https://calendar.example.com/api/attachments'),
    {} as ConstructorParameters<typeof HTTPError>[2]
  )

describe('uploadAttachment', () => {
  const driveLink = 'https://user-drive.example.com/public?sharecode=abc#/'

  beforeEach(() => {
    vi.clearAllMocks()
    mockPost.mockResolvedValue({
      json: () => Promise.resolve({ uri: driveLink })
    })
  })

  it('sends the raw file with its type and encoded name', async () => {
    const file = new File(['%PDF'], 'compte rendu é.pdf', {
      type: 'application/pdf'
    })

    await uploadAttachment(file)

    expect(mockPost).toHaveBeenCalledWith(
      'api/attachments',
      expect.objectContaining({
        body: file,
        headers: {
          'Content-Type': 'application/pdf',
          'X-Filename': 'compte%20rendu%20%C3%A9.pdf'
        }
      })
    )
  })

  it('gives up on a stalled upload after a while', async () => {
    await uploadAttachment(new File(['a'], 'a.txt'))

    expect(mockPost).toHaveBeenCalledWith(
      'api/attachments',
      expect.objectContaining({ timeout: UPLOAD_TIMEOUT_MS })
    )
  })

  it('returns an attachment pointing at the Drive public link', async () => {
    const file = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })

    const attachment = await uploadAttachment(file)

    expect(attachment.uri).toBe(driveLink)
    expect(attachment.fmttype).toBe('application/pdf')
    expect(attachment.x_filename).toBe('report.pdf')
  })

  it('sends a file of unknown type as binary data', async () => {
    const file = new File(['data'], 'notes')

    const attachment = await uploadAttachment(file)

    expect(mockPost).toHaveBeenCalledWith(
      'api/attachments',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/octet-stream'
        })
      })
    )
    expect(attachment.fmttype).toBeUndefined()
  })
})

describe('toAttachmentUploadFailure', () => {
  it.each([
    [404, 'unavailable'],
    [400, 'rejected'],
    [413, 'tooLarge'],
    [504, 'timeout'],
    [502, 'failed'],
    [500, 'failed']
  ])('tells a %s as %s', (status, failure) => {
    expect(toAttachmentUploadFailure(httpError(status))).toBe(failure)
  })

  it('has nothing to tell on a 401: the user signs in again', () => {
    expect(toAttachmentUploadFailure(httpError(401))).toBeNull()
  })

  it('tells a request that timed out in the browser as a timeout', () => {
    const request = new Request('https://calendar.example.com/api/attachments')
    expect(toAttachmentUploadFailure(new TimeoutError(request))).toBe('timeout')
  })

  it('reports a network error as a failed upload', () => {
    expect(toAttachmentUploadFailure(new TypeError('Failed to fetch'))).toBe(
      'failed'
    )
  })
})
