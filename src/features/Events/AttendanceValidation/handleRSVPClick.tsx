import { AppDispatch } from "@/app/store";
import { handleRSVP } from "@/components/Event/eventHandlers/eventHandlers";
import { PartStat } from "@/features/User/models/attendee";
import { userData } from "@/features/User/userDataTypes";
import { Calendar } from "@fullcalendar/core";
import { Dispatch, SetStateAction } from "react";
import { ContextualizedEvent } from "../EventsTypes";

export async function handleRSVPClick(
  rsvp: PartStat,
  contextualizedEvent: ContextualizedEvent,
  user: userData | undefined,
  calendarList: Calendar[],
  setAfterChoiceFunc: Dispatch<SetStateAction<Function | undefined>>,
  setOpenEditModePopup: Dispatch<SetStateAction<string | null>>,
  dispatch: AppDispatch
) {
  const { isRecurring, calendar, event } = contextualizedEvent;
  if (isRecurring) {
    setAfterChoiceFunc(() => async (type: string) => {
      try {
        await handleRSVP(
          dispatch,
          calendar,
          user,
          event,
          rsvp,
          type,
          calendarList
        );
      } catch (error) {
        console.error("Error handling RSVP:", error);
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
