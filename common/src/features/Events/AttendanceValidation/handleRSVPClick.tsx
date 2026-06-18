import { AppDispatch } from '@common/app/store'
import { handleRSVP } from '@common/components/Event/eventHandlers/eventHandlers'
import { PartStat } from '@common/features/User/models/attendee'
import { userData } from '@common/features/User/userDataTypes'
import { Dispatch, SetStateAction } from 'react'
import { ContextualizedEvent } from '@common/types/EventsTypes'

export async function handleRSVPClick(
  rsvp: PartStat,
  contextualizedEvent: ContextualizedEvent,
  user: userData | undefined,
  setAfterChoiceFunc: (
    func: ((type: 'solo' | 'all' | undefined) => void) | undefined
  ) => void,
  setOpenEditModePopup: Dispatch<SetStateAction<string | null>>,
  dispatch: AppDispatch,
  onLoadingChange?: (loading: boolean, value?: PartStat) => void
): Promise<void> {
  const { isRecurring, calendar, event } = contextualizedEvent

  if (isRecurring) {
    setAfterChoiceFunc(
      () =>
        async (type: 'solo' | 'all' | undefined): Promise<void> => {
          // If user cancelled the modal, don't proceed
          if (type === undefined) {
            return
          }

          // Now start loading since user made a choice
          onLoadingChange?.(true, rsvp)

          try {
            await handleRSVP({
              dispatch,
              calendar,
              user,
              event,
              rsvp,
              typeOfAction: type
            })
            onLoadingChange?.(false)
          } catch (error) {
            console.error('Error handling RSVP:', error)
            // Clear loading on error
            onLoadingChange?.(false)
          }
        }
    )
    setOpenEditModePopup('attendance')
  } else {
    try {
      await handleRSVP({
        dispatch,
        calendar,
        user,
        event,
        rsvp
      })
      onLoadingChange?.(false)
    } catch (error) {
      console.error('Error handling RSVP:', error)
      onLoadingChange?.(false)
    }
  }
}
