import {
  MAX_PARALLEL_UPLOADS,
  useAttachmentUpload
} from '@common/features/Tdrive/hooks/useAttachmentUpload'
import { Attachment } from '@common/types/Attachment'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'

vi.mock('@common/features/Tdrive/AttachmentDao', async () => ({
  ...(await vi.importActual('@common/features/Tdrive/AttachmentDao')),
  uploadAttachment: vi.fn(),
  toAttachmentUploadFailure: vi.fn()
}))

import {
  toAttachmentUploadFailure,
  uploadAttachment
} from '@common/features/Tdrive/AttachmentDao'

const mockUpload = vi.mocked(uploadAttachment)
const mockToFailure = vi.mocked(toAttachmentUploadFailure)

const deferred = <T,>() => {
  let resolveDeferred!: (value: T) => void
  const promise = new Promise<T>(resolve => {
    resolveDeferred = resolve
  })
  return { promise, resolve: resolveDeferred }
}

const attachmentFor = (name: string): Attachment =>
  new Attachment(`https://drive.example.com/public?sharecode=${name}`, '', name)

// The form keeps its attachments in state: the hook reads them back each render
const renderUploadHook = (initial: Attachment[] = []) =>
  renderHook(() => {
    const [attachments, setAttachments] = useState(initial)
    return {
      attachments,
      ...useAttachmentUpload({ attachments, setAttachments })
    }
  })

describe('useAttachmentUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a file as pending until its link is back', async () => {
    const upload = deferred<Attachment>()
    mockUpload.mockReturnValue(upload.promise)
    const { result } = renderUploadHook()

    act(() => result.current.uploadFiles([new File(['a'], 'a.txt')]))

    expect(result.current.pendingUploads).toEqual([
      expect.objectContaining({ name: 'a.txt' })
    ])
    expect(result.current.attachments).toEqual([])

    await act(async () => upload.resolve(attachmentFor('a.txt')))

    expect(result.current.pendingUploads).toEqual([])
    expect(result.current.attachments).toEqual([attachmentFor('a.txt')])
  })

  it('keeps every file of uploads finishing in the same tick', async () => {
    const existing = attachmentFor('existing.pdf')
    mockUpload.mockImplementation(file =>
      Promise.resolve(attachmentFor(file.name))
    )
    const { result } = renderUploadHook([existing])

    await act(async () =>
      result.current.uploadFiles([
        new File(['a'], 'a.txt'),
        new File(['b'], 'b.txt')
      ])
    )

    expect(result.current.attachments).toEqual([
      existing,
      attachmentFor('a.txt'),
      attachmentFor('b.txt')
    ])
  })

  it('reports a failed upload and adds nothing', async () => {
    const error = new Error('Request failed with status code 413')
    mockUpload.mockRejectedValue(error)
    mockToFailure.mockReturnValue('tooLarge')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderUploadHook()

    await act(async () =>
      result.current.uploadFiles([new File(['a'], 'big.iso')])
    )

    await waitFor(() => expect(result.current.uploadFailure).toBe('tooLarge'))
    expect(mockToFailure).toHaveBeenCalledWith(error)
    expect(result.current.pendingUploads).toEqual([])
    expect(result.current.attachments).toEqual([])

    act(() => result.current.dismissUploadFailure())
    expect(result.current.uploadFailure).toBeNull()
  })

  it('drops an upload that finishes after the form closed', async () => {
    const upload = deferred<Attachment>()
    mockUpload.mockReturnValue(upload.promise)
    const setAttachments = vi.fn()
    const { result, unmount } = renderHook(() =>
      useAttachmentUpload({ attachments: [], setAttachments })
    )

    act(() => result.current.uploadFiles([new File(['a'], 'a.txt')]))
    unmount()
    await act(async () => upload.resolve(attachmentFor('a.txt')))

    expect(setAttachments).not.toHaveBeenCalled()
  })
  it('uploads a few files at a time and queues the others', async () => {
    const uploads = Array.from({ length: MAX_PARALLEL_UPLOADS + 2 }, () =>
      deferred<Attachment>()
    )
    uploads.forEach(upload => mockUpload.mockReturnValueOnce(upload.promise))
    const files = uploads.map((_, i) => new File(['x'], `f${i}.txt`))
    const { result } = renderUploadHook()

    act(() => result.current.uploadFiles(files))

    // All shown as uploading, only the first ones sent
    expect(result.current.pendingUploads).toHaveLength(files.length)
    expect(mockUpload).toHaveBeenCalledTimes(MAX_PARALLEL_UPLOADS)

    await act(async () => uploads[0].resolve(attachmentFor('f0.txt')))

    expect(mockUpload).toHaveBeenCalledTimes(MAX_PARALLEL_UPLOADS + 1)
    expect(mockUpload).toHaveBeenLastCalledWith(files[MAX_PARALLEL_UPLOADS])

    await act(async () => {
      uploads
        .slice(1)
        .forEach((upload, i) => upload.resolve(attachmentFor(`f${i + 1}.txt`)))
    })

    await waitFor(() => expect(result.current.pendingUploads).toEqual([]))
    expect(mockUpload).toHaveBeenCalledTimes(files.length)
    expect(result.current.attachments).toHaveLength(files.length)
  })
})
