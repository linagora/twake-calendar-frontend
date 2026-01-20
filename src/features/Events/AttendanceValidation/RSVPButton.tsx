import { useAppDispatch } from "@/app/hooks";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { PartStat } from "@/features/User/models/attendee";
import { userData } from "@/features/User/userDataTypes";
import { Button } from "@linagora/twake-mui";
import { Dispatch, SetStateAction } from "react";
import { useI18n } from "twake-i18n";
import { ContextualizedEvent } from "../EventsTypes";
import { handleRSVPClick } from "./handleRSVPClick";

const rsvpColor: Record<PartStat, "success" | "error" | "warning" | "primary"> =
  {
    ACCEPTED: "success",
    DECLINED: "error",
    TENTATIVE: "warning",
    "NEEDS-ACTION": "primary",
  } as const;

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
      size="medium"
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
