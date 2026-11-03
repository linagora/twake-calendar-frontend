/**
 * @vitest-environment jsdom
 */

import type { Mock } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useVideoConference } from '@common/components/Event/hooks/useVideoConference'
import { createVideoConferenceRoom } from '@common/features/Events/VideoConferenceDao'

vi.mock('@common/features/Events/VideoConferenceDao')
vi.mock('@common/app/hooks', () => ({
  useAppSelector: vi.fn(() => undefined)
}))

const LOCAL_LINK_PATTERN = /^https:\/\/meet\.local\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/

describe('useVideoConference', () => {
  const setHasVideoConference = vi.fn()
  const setMeetingLink = vi.fn()
  const setShowDescription = vi.fn()
  const originalBaseUrl = window.VIDEO_CONFERENCE_BASE_URL
  const originalIntegration = window.MEET_BACKEND_INTEGRATION

  const renderVideoConferenceHook = () =>
    renderHook(() =>
      useVideoConference({
        description: '',
        setDescription: vi.fn(),
        setHasVideoConference,
        setMeetingLink,
        showMore: true,
        setShowDescription
      })
    )

  const addVideoConference = async (): Promise<void> => {
    const { result } = renderVideoConferenceHook()
    await act(async () => {
      result.current.handleAddVideoConference()
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.VIDEO_CONFERENCE_BASE_URL = 'https://meet.local'
  })

  afterEach(() => {
    window.VIDEO_CONFERENCE_BASE_URL = originalBaseUrl
    window.MEET_BACKEND_INTEGRATION = originalIntegration
  })

  it('generates the meeting code locally by default', async () => {
    window.MEET_BACKEND_INTEGRATION = undefined

    await addVideoConference()

    expect(createVideoConferenceRoom).not.toHaveBeenCalled()
    expect(setHasVideoConference).toHaveBeenCalledWith(true)
    expect(setMeetingLink).toHaveBeenCalledWith(
      expect.stringMatching(LOCAL_LINK_PATTERN)
    )
    expect(setShowDescription).toHaveBeenCalledWith(true)
  })

  it('uses the room created by the side service when enabled', async () => {
    window.MEET_BACKEND_INTEGRATION = true
    ;(createVideoConferenceRoom as Mock).mockResolvedValue(
      'https://meet.example.com/vep-txbc-trh'
    )

    await addVideoConference()

    expect(setHasVideoConference).toHaveBeenCalledWith(true)
    expect(setMeetingLink).toHaveBeenCalledWith(
      'https://meet.example.com/vep-txbc-trh'
    )
  })

  it('falls back to a local code when Meet is not configured', async () => {
    window.MEET_BACKEND_INTEGRATION = true
    ;(createVideoConferenceRoom as Mock).mockResolvedValue(null)

    await addVideoConference()

    expect(setMeetingLink).toHaveBeenCalledWith(
      expect.stringMatching(LOCAL_LINK_PATTERN)
    )
  })

  it('adds no video conference when the room creation fails', async () => {
    window.MEET_BACKEND_INTEGRATION = true
    ;(createVideoConferenceRoom as Mock).mockRejectedValue(
      new Error('createVideoConferenceRoom failed with status 502')
    )
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderVideoConferenceHook()
    await act(async () => {
      result.current.handleAddVideoConference()
    })

    expect(setHasVideoConference).not.toHaveBeenCalled()
    expect(setMeetingLink).not.toHaveBeenCalled()
    expect(result.current.hasCreationFailed).toBe(true)
    expect(result.current.isCreatingRoom).toBe(false)
    consoleError.mockRestore()
  })

  it('clears the failure when retrying and when dismissed', async () => {
    window.MEET_BACKEND_INTEGRATION = true
    ;(createVideoConferenceRoom as Mock).mockRejectedValueOnce(
      new Error('Failed to fetch')
    )
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderVideoConferenceHook()
    await act(async () => {
      result.current.handleAddVideoConference()
    })
    expect(result.current.hasCreationFailed).toBe(true)

    act(() => {
      result.current.dismissCreationFailure()
    })
    expect(result.current.hasCreationFailed).toBe(false)
    ;(createVideoConferenceRoom as Mock).mockResolvedValueOnce(
      'https://meet.example.com/vep-txbc-trh'
    )
    await act(async () => {
      result.current.handleAddVideoConference()
    })
    expect(result.current.hasCreationFailed).toBe(false)
    expect(setMeetingLink).toHaveBeenCalledWith(
      'https://meet.example.com/vep-txbc-trh'
    )
    consoleError.mockRestore()
  })

  it('reports the room creation as pending until it settles', async () => {
    window.MEET_BACKEND_INTEGRATION = true
    let resolveRoom: (url: string) => void = () => {}
    ;(createVideoConferenceRoom as Mock).mockReturnValue(
      new Promise<string>(resolve => {
        resolveRoom = resolve
      })
    )
    const { result } = renderVideoConferenceHook()

    act(() => {
      result.current.handleAddVideoConference()
    })
    expect(result.current.isCreatingRoom).toBe(true)

    await act(async () => {
      resolveRoom('https://meet.example.com/vep-txbc-trh')
    })
    expect(result.current.isCreatingRoom).toBe(false)
  })

  it('creates a single room when adding twice while the request is pending', async () => {
    window.MEET_BACKEND_INTEGRATION = true
    let resolveRoom: (url: string) => void = () => {}
    ;(createVideoConferenceRoom as Mock).mockReturnValue(
      new Promise<string>(resolve => {
        resolveRoom = resolve
      })
    )
    const { result } = renderVideoConferenceHook()

    await act(async () => {
      result.current.handleAddVideoConference()
      result.current.handleAddVideoConference()
      resolveRoom('https://meet.example.com/vep-txbc-trh')
    })

    expect(createVideoConferenceRoom).toHaveBeenCalledTimes(1)
    expect(setMeetingLink).toHaveBeenCalledTimes(1)
  })
})
