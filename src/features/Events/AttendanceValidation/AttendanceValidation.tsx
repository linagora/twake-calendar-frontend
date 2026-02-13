import { userData } from "@/features/User/userDataTypes";
import { Box, Typography } from "@linagora/twake-mui";
import { Dispatch, SetStateAction, useState } from "react";
import { useI18n } from "twake-i18n";
import { ContextualizedEvent } from "../EventsTypes";
import { RSVPButton } from "./RSVPButton";
import { PartStat } from "@/features/User/models/attendee";

interface AttendanceValidationProps {
  contextualizedEvent: ContextualizedEvent;
  user: userData | undefined;
  setAfterChoiceFunc: (
    func: ((type: "solo" | "all" | undefined) => void) | undefined
  ) => void;
  setOpenEditModePopup: Dispatch<SetStateAction<string | null>>;
}

export function AttendanceValidation({
  contextualizedEvent,
  user,
  setAfterChoiceFunc,
  setOpenEditModePopup,
}: AttendanceValidationProps) {
  const { currentUserAttendee, isOwn } = contextualizedEvent;
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingValue, setLoadingValue] = useState<PartStat | null>(null);

  // Check if we should show RSVP buttons
  const hasNoAttendeesOrOrganizer =
    !(contextualizedEvent.event?.attendee?.length > 0) &&
    !contextualizedEvent.event?.organizer;

  if (
    !(
      ((currentUserAttendee || hasNoAttendeesOrOrganizer) && isOwn) ||
      contextualizedEvent.calendar.delegated
    )
  ) {
    return null;
  }

  const handleLoadingChange = (loading: boolean, value?: PartStat) => {
    setIsLoading(loading);
    setLoadingValue(loading && value ? value : null);
  };

  const commonButtonProps = {
    contextualizedEvent,
    user,
    setAfterChoiceFunc,
    setOpenEditModePopup,
    isLoading,
    onLoadingChange: handleLoadingChange,
    loadingValue,
  };

  return (
    <>
      <Typography sx={{ marginRight: 2 }}>
        {t("eventPreview.attendingQuestion")}
      </Typography>
      <Box display="flex" gap="15px" alignItems="center">
        <RSVPButton rsvpValue="ACCEPTED" {...commonButtonProps} />
        <RSVPButton rsvpValue="TENTATIVE" {...commonButtonProps} />
        <RSVPButton rsvpValue="DECLINED" {...commonButtonProps} />
      </Box>
    </>
  );
}
