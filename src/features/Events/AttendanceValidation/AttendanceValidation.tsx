import { userData } from "@/features/User/userDataTypes";
import { Box, Typography } from "@linagora/twake-mui";
import { Dispatch, SetStateAction, useState } from "react";
import { useI18n } from "twake-i18n";
import { ContextualizedEvent } from "../EventsTypes";
import { RSVPButton } from "./RSVPButton";

interface AttendanceValidationProps {
  contextualizedEvent: ContextualizedEvent;
  user: userData | undefined;
  setAfterChoiceFunc: Dispatch<SetStateAction<Function | undefined>>;
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
  const [isLoadingAccept, setIsLoadingAccept] = useState(false);
  const [isLoadingTempt, setIsLoadingTempt] = useState(false);
  const [isLoadingDecline, setIsLoadingDecline] = useState(false);

  // Check if we should show RSVP buttons
  const hasNoAttendeesOrOrganizer =
    !(contextualizedEvent.event?.attendee?.length > 0) &&
    !contextualizedEvent.event?.organizer;

  if (!((currentUserAttendee || hasNoAttendeesOrOrganizer) && isOwn)) {
    return null;
  }

  const commonButtonProps = {
    contextualizedEvent,
    user,
    setAfterChoiceFunc,
    setOpenEditModePopup,
  };

  return (
    <>
      <Typography sx={{ marginRight: 2 }}>
        {t("eventPreview.attendingQuestion")}
      </Typography>
      <Box display="flex" gap="15px" alignItems="center">
        <RSVPButton
          rsvpValue="ACCEPTED"
          {...commonButtonProps}
          isLoading={isLoadingAccept}
          onLoadingChange={setIsLoadingAccept}
        />
        <RSVPButton
          rsvpValue="TENTATIVE"
          {...commonButtonProps}
          isLoading={isLoadingTempt}
          onLoadingChange={setIsLoadingTempt}
        />
        <RSVPButton
          rsvpValue="DECLINED"
          {...commonButtonProps}
          isLoading={isLoadingDecline}
          onLoadingChange={setIsLoadingDecline}
        />
      </Box>
    </>
  );
}
