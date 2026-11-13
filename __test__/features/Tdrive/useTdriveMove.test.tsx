import { renderHook, waitFor, act } from '@testing-library/react'
import {
  toSavedDriveFile,
  useTdriveMove
} from '@common/features/Tdrive/hooks/useTdriveMove'
import { Provider } from 'react-redux'
import { setupStore } from '@common/app/store'
import React, { PropsWithChildren } from 'react'

// Like cozy-interapp, create() returns the intent creation request promise
// and stop() is attached to the promise returned by start()
const mockStart = vi.fn()
const mockStop = vi.fn()
const withStart = (creation: Promise<unknown>): Promise<unknown> =>
  Object.assign(creation, {
    start: (...args: unknown[]) =>
      Object.assign(mockStart(...args), { stop: mockStop })
  })
const mockCreate = vi.fn()

vi.mock('cozy-interapp', () => ({
  default: vi.fn().mockImplementation(function () {
    return { create: mockCreate }
  })
}))

const mockEnsureSdkSignedIn = vi.fn()

vi.mock('@common/utils/sdkSession', () => ({
  ensureSdkSignedIn: (...args: unknown[]): unknown =>
    mockEnsureSdkSignedIn(...args)
}))

const savedFile = { id: 'file-1', name: 'agenda.pdf', dirId: 'calendar-dir' }

describe('toSavedDriveFile', () => {
  it('reads the document the UPLOAD intent answers with', () => {
    expect(
      toSavedDriveFile({
        _id: 'file-1',
        _type: 'io.cozy.files',
        type: 'file',
        name: 'agenda.pdf',
        dir_id: 'calendar-dir'
      })
    ).toEqual(savedFile)
  })

  it('returns null for a document without an id or a folder', () => {
    expect(toSavedDriveFile({ name: 'agenda.pdf', dir_id: 'd' })).toBeNull()
    expect(toSavedDriveFile({ _id: 'f', name: 'agenda.pdf' })).toBeNull()
    expect(toSavedDriveFile(null)).toBeNull()
  })
})

describe('useTdriveMove', () => {
  const wrapper = ({ children }: PropsWithChildren) =>
    React.createElement(
      Provider,
      {
        store: setupStore({
          user: {
            userData: {
              email: 'alice@example.com',
              workplaceFqdn: 'drive.example.com'
            },
            organiserData: {},
            tokens: { id_token: 'user-id-token' }
          }
        })
      },
      children
    )

  const renderMove = (
    props: Parameters<typeof useTdriveMove>[0]
  ): { current: ReturnType<typeof useTdriveMove> } => {
    const { result } = renderHook(() => useTdriveMove(props), { wrapper })
    Object.defineProperty(result.current.containerRef, 'current', {
      value: document.createElement('div'),
      writable: true,
      configurable: true
    })
    return result
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockEnsureSdkSignedIn.mockResolvedValue({ status: 'ready' })
    mockCreate.mockImplementation(() => withStart(Promise.resolve({})))
  })

  it('opens the MOVE intent on the file, in the folder it is in', async () => {
    mockStart.mockImplementation(() => new Promise(() => undefined))
    const result = renderMove({ onMoved: vi.fn() })

    act(() => {
      void result.current.openMove(savedFile)
    })

    await waitFor(() => expect(result.current.isOpen).toBe(true))
    expect(mockCreate).toHaveBeenCalledWith(
      'MOVE',
      'io.cozy.files',
      {
        fileIds: ['file-1'],
        defaultDirId: 'calendar-dir',
        theme: { type: 'light' }
      },
      ['GET']
    )
  })

  it('gives the moved files with their new path', async () => {
    mockStart.mockResolvedValue([
      {
        _id: 'file-1b',
        _type: 'io.cozy.files',
        name: 'agenda.pdf',
        dir_id: 'projects',
        path: '/Projects/agenda.pdf'
      }
    ])
    const onMoved = vi.fn()
    const result = renderMove({ onMoved })

    await act(() => result.current.openMove(savedFile))

    expect(onMoved).toHaveBeenCalledWith([
      { id: 'file-1b', name: 'agenda.pdf', path: '/Projects/agenda.pdf' }
    ])
    expect(result.current.isOpen).toBe(false)
  })

  it('tells a cancellation in the service apart from a move', async () => {
    mockStart.mockResolvedValue(null)
    const onMoved = vi.fn()
    const onCancelled = vi.fn()
    const result = renderMove({ onMoved, onCancelled })

    await act(() => result.current.openMove(savedFile))

    expect(onCancelled).toHaveBeenCalled()
    expect(onMoved).not.toHaveBeenCalled()
  })

  it('reports an intent that fails to open', async () => {
    mockStart.mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const result = renderMove({ onMoved: vi.fn() })

    await act(() => result.current.openMove(savedFile))

    expect(result.current.openMoveError).toBe('tdriveMoveFailed')
  })
})
