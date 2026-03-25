import { PartStat } from "@/features/User/models/attendee";
import { userData } from "@/features/User/userDataTypes";
import { Box, Typography } from "@linagora/twake-mui";
import { Dispatch, SetStateAction, useState } from "react";
import { useI18n } from "twake-i18n";
import { ContextualizedEvent } from "../EventsTypes";
import { EventCounterModal } from "./EventCounterModal";
import { RSVPButton } from "./RSVPButton";

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
  const { currentUserAttendee, isOwn, calendar } = contextualizedEvent;
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingValue, setLoadingValue] = useState<PartStat | null>(null);
  const [openCounterModal, setOpenCounterModal] = useState(false);

  const hasNoAttendeesOrOrganizer =
    !(contextualizedEvent.event?.attendee?.length > 0) &&
    !contextualizedEvent.event?.organizer;

  const createByTheUser = currentUserAttendee || hasNoAttendeesOrOrganizer;
  const editRightInSelfCalendar = createByTheUser && isOwn;
  const isDelegatedPublicEvent =
    contextualizedEvent.calendar.delegated &&
    (!contextualizedEvent.event.class ||
      contextualizedEvent.event.class === "PUBLIC");

  const { owner: resourceOwner } = calendar;
  const isAdminOfResource =
    resourceOwner?.resource &&
    resourceOwner?.administrators?.some(
      (admin) => admin.id === user?.openpaasId
    );

  if (
    !(editRightInSelfCalendar || isDelegatedPublicEvent || isAdminOfResource)
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
      <Typography variant="body2" sx={{ marginRight: 1 }}>
        {calendar.owner?.resource
          ? t("eventPreview.authorizeQuestion")
          : t("eventPreview.attendingQuestion")}
      </Typography>
      <Box display="flex" gap={1} mx={1} alignItems="center">
        <RSVPButton rsvpValue="ACCEPTED" {...commonButtonProps} />
        <RSVPButton rsvpValue="DECLINED" {...commonButtonProps} />
        <RSVPButton rsvpValue="TENTATIVE" {...commonButtonProps} />
      </Box>
      {!contextualizedEvent.isOrganizer && (
        <Typography
          variant="body2"
          onClick={() => setOpenCounterModal(!openCounterModal)}
          sx={{ marginLeft: 1, cursor: "pointer" }}
        >
          {t("eventPreview.proposeNewTime")}
        </Typography>
      )}
      <EventCounterModal
        open={openCounterModal}
        setOpen={setOpenCounterModal}
        contextualizedEvent={contextualizedEvent}
      />
    </>
  );
}
