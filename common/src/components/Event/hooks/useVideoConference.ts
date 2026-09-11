import { useAppSelector } from '@common/app/hooks'
import { createVideoConference } from '@common/features/Events/VideoConferenceDao'
import { generateMeetingLink } from '@common/utils/videoConferenceUtils'
import { useState } from 'react'

interface UseVideoConferenceProps {
  description: string
  setDescription: (value: string) => void
  setHasVideoConference: (value: boolean) => void
  setMeetingLink: (value: string | null) => void
  showMore: boolean
  setShowDescription?: (value: boolean) => void
}

interface UseVideoConferenceReturn {
  handleAddVideoConference: () => Promise<void>
  handleDeleteVideoConference: () => void
  isAddingVideoConference: boolean
}

export const useVideoConference = ({
  setHasVideoConference,
  setMeetingLink,
  showMore,
  setShowDescription
}: UseVideoConferenceProps): UseVideoConferenceReturn => {
  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )
  const email = useAppSelector(state => state.user.userData?.email)
  const [isAddingVideoConference, setIsAddingVideoConference] = useState(false)

  /**
   * The link now comes from the server, which creates the room before the
   * invitation goes out. `generateMeetingLink` remains the fallback for
   * deployments whose server does not mint rooms — it is the old behaviour,
   * kept for them and only for them.
   */
  const handleAddVideoConference = async (): Promise<void> => {
    if (isAddingVideoConference) return
    setIsAddingVideoConference(true)
    try {
      const localLink = (): string =>
        generateMeetingLink({
          localpart: email?.split('@')[0],
          workplaceFqdn
        })

      let newMeetingLink: string
      try {
        newMeetingLink = (await createVideoConference()) ?? localLink()
      } catch {
        // A conferencing backend that is down must not block saving the
        // event. The local link is what this form produced until now, so
        // falling back to it is no worse than the previous behaviour.
        newMeetingLink = localLink()
      }

      if (!newMeetingLink) return

      setHasVideoConference(true)
      setMeetingLink(newMeetingLink)
      if (showMore) {
        setShowDescription?.(true)
      }
    } finally {
      setIsAddingVideoConference(false)
    }
  }

  const handleDeleteVideoConference = (): void => {
    setHasVideoConference(false)
    setMeetingLink(null)
  }

  return {
    handleAddVideoConference,
    handleDeleteVideoConference,
    isAddingVideoConference
  }
}
