import { Dispatch, SetStateAction } from "react";
import { AppDispatch } from "../../../app/store";
import { handleRSVP } from "../../../components/Event/eventHandlers/eventHandlers";
import { Calendar } from "../../Calendars/CalendarTypes";
import { PartStat } from "../../User/models/attendee";
import { userData } from "../../User/userDataTypes";
import { ContextualizedEvent } from "../EventsTypes";

export function handleRSVPClick(
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
    setAfterChoiceFunc(
      () => (type: string) =>
        handleRSVP(dispatch, calendar, user, event, rsvp, type, calendarList)
    );
    setOpenEditModePopup("attendance");
  } else {
    handleRSVP(dispatch, calendar, user, event, rsvp);
  }
}
