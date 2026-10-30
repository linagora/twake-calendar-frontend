import type { Mock } from 'vitest'
import { VideoConferenceField } from '@common/components/Event/fields/VideoConferenceField'
import { createVideoConferenceRoom } from '@common/features/Events/VideoConferenceDao'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../utils/Renderwithproviders'

vi.mock('@common/features/Events/VideoConferenceDao')

describe('VideoConferenceField room creation failure (#1821)', () => {
  const originalIntegration = window.MEET_BACKEND_INTEGRATION
  const setHasVideoConference = vi.fn()
  const setMeetingLink = vi.fn()

  const renderField = (showMore: boolean): void => {
    renderWithProviders(
      <VideoConferenceField
        hasVideoConference={false}
        setHasVideoConference={setHasVideoConference}
        meetingLink={null}
        setMeetingLink={setMeetingLink}
        description=""
        setDescription={vi.fn()}
        showMore={showMore}
      />
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.MEET_BACKEND_INTEGRATION = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    window.MEET_BACKEND_INTEGRATION = originalIntegration
    vi.restoreAllMocks()
  })

  it.each([
    ['expanded', true],
    ['simple', false]
  ])(
    'tells the user the room could not be created in %s mode',
    async (_mode, showMore) => {
      ;(createVideoConferenceRoom as Mock).mockRejectedValue(
        new Error('createVideoConferenceRoom failed with status 500')
      )
      renderField(showMore)

      fireEvent.click(screen.getByText('event.form.addVisioConference'))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'event.form.videoConferenceCreationFailed'
      )
      expect(setHasVideoConference).not.toHaveBeenCalled()
      expect(
        screen.getByText('event.form.addVisioConference')
      ).toBeInTheDocument()
    }
  )

  it('hides the failure once the user dismisses it', async () => {
    ;(createVideoConferenceRoom as Mock).mockRejectedValue(
      new Error('createVideoConferenceRoom failed with status 500')
    )
    renderField(true)

    fireEvent.click(screen.getByText('event.form.addVisioConference'))
    const alert = await screen.findByRole('alert')
    fireEvent.click(within(alert).getByRole('button'))

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    )
  })

  it('creates the room when the user retries after a failure', async () => {
    ;(createVideoConferenceRoom as Mock)
      .mockRejectedValueOnce(
        new Error('createVideoConferenceRoom failed with status 500')
      )
      .mockResolvedValueOnce('https://meet.example.com/vep-txbc-trh')
    renderField(true)

    fireEvent.click(screen.getByText('event.form.addVisioConference'))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByText('event.form.addVisioConference'))

    await waitFor(() =>
      expect(setMeetingLink).toHaveBeenCalledWith(
        'https://meet.example.com/vep-txbc-trh'
      )
    )
    expect(createVideoConferenceRoom).toHaveBeenCalledTimes(2)
    expect(setHasVideoConference).toHaveBeenCalledWith(true)
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    )
  })

  it('shows no error when the room is created', async () => {
    ;(createVideoConferenceRoom as Mock).mockResolvedValue(
      'https://meet.example.com/vep-txbc-trh'
    )
    renderField(true)

    fireEvent.click(screen.getByText('event.form.addVisioConference'))

    await screen.findByText('event.form.addVisioConference')
    expect(setMeetingLink).toHaveBeenCalledWith(
      'https://meet.example.com/vep-txbc-trh'
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
