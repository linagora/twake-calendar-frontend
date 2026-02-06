import { AppDispatch } from "@/app/store";
import { handleRSVP } from "@/components/Event/eventHandlers/eventHandlers";
import { PartStat } from "@/features/User/models/attendee";
import { userData } from "@/features/User/userDataTypes";
import { Dispatch, SetStateAction } from "react";
import { ContextualizedEvent } from "../EventsTypes";

export async function handleRSVPClick(
  rsvp: PartStat,
  contextualizedEvent: ContextualizedEvent,
  user: userData | undefined,
  setAfterChoiceFunc: Dispatch<SetStateAction<Function | undefined>>,
  setOpenEditModePopup: Dispatch<SetStateAction<string | null>>,
  dispatch: AppDispatch,
  onLoadingChange?: (loading: boolean, value?: PartStat) => void
) {
  const { isRecurring, calendar, event } = contextualizedEvent;

  if (isRecurring) {
    setAfterChoiceFunc(() => async (type: string | null) => {
      // If user cancelled the modal, don't proceed
      if (type === null) {
        return;
      }

      // Now start loading since user made a choice
      if (onLoadingChange) {
        onLoadingChange(true, rsvp);
      }

      try {
        await handleRSVP(dispatch, calendar, user, event, rsvp, type);
      } catch (error) {
        console.error("Error handling RSVP:", error);
        // Clear loading on error
        if (onLoadingChange) {
          onLoadingChange(false);
        }
      }
    });
    setOpenEditModePopup("attendance");
  } else {
    try {
      await handleRSVP(dispatch, calendar, user, event, rsvp);
    } catch (error) {
      console.error("Error handling RSVP:", error);
    }
  }
}
