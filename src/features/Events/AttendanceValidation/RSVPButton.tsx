import { Button } from "@mui/material";
import { Dispatch, SetStateAction } from "react";
import { useI18n } from "twake-i18n";
import { useAppDispatch } from "../../../app/hooks";
import { Calendar } from "../../Calendars/CalendarTypes";
import { PartStat } from "../../User/models/attendee";
import { userData } from "../../User/userDataTypes";
import { ContextualizedEvent } from "../EventsTypes";
import { handleRSVPClick } from "./handleRSVPClick";

const rsvpColor = {
  ACCEPTED: "success",
  DECLINED: "error",
  TENTATIVE: "warning",
  "NEEDS-ACTION": "primary",
};

interface RSVPButtonProps {
  rsvpValue: PartStat;
  contextualizedEvent: ContextualizedEvent;
  user: userData | undefined;
  calendarList: Calendar[];
  setAfterChoiceFunc: Dispatch<SetStateAction<Function | undefined>>;
  setOpenEditModePopup: Dispatch<SetStateAction<string | null>>;
}

export function RSVPButton({
  rsvpValue,
  contextualizedEvent,
  user,
  calendarList,
  setAfterChoiceFunc,
  setOpenEditModePopup,
}: RSVPButtonProps) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const { currentUserAttendee } = contextualizedEvent;

  return (
    <Button
      variant={
        currentUserAttendee?.partstat === rsvpValue ? "contained" : "outlined"
      }
      color={
        currentUserAttendee?.partstat === rsvpValue
          ? rsvpColor[rsvpValue]
          : "primary"
      }
      size="large"
      sx={{ borderRadius: "50px" }}
      onClick={() =>
        handleRSVPClick(
          rsvpValue,
          contextualizedEvent,
          user,
          calendarList,
          setAfterChoiceFunc,
          setOpenEditModePopup,
          dispatch
        )
      }
    >
      {t(`eventPreview.${rsvpValue}`)}
    </Button>
  );
}
