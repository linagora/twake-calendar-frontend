import { CalendarName } from "@/components/Calendar/CalendarName";
import { formatEventChipTitle } from "@/components/Calendar/utils/calendarUtils";
import ResponsiveDialog from "@/components/Dialog/ResponsiveDialog";
import { EditModeDialog } from "@/components/Event/EditModeDialog";
import { getTimezoneOffset } from "@/utils/timezone";
import { DateSelectArg } from "@fullcalendar/core";
import { Box, Chip, Tooltip, Typography } from "@linagora/twake-mui";
import CircleIcon from "@mui/icons-material/Circle";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import { useEffect } from "react";
import { useI18n } from "twake-i18n";
import { AttendanceValidation } from "../AttendanceValidation/AttendanceValidation";
import EventPopover from "../EventModal";
import { EventPreviewActionMenu } from "../EventPreview/EventPreviewActionMenu";
import { EventPreviewDetails } from "../EventPreview/EventPreviewDetails";
import { EventPreviewHeader } from "../EventPreview/EventPreviewHeader";
import { useEventPreviewState } from "../EventPreview/useEventPreviewState";
import EventUpdateModal from "../EventUpdateModal";
import { formatDate } from "./utils/formatDate";
import { formatEnd } from "./utils/formatEnd";

export default function EventPreviewModal({
  eventId,
  calId,
  tempEvent,
  open,
  onClose,
}: {
  eventId: string;
  calId: string;
  tempEvent?: boolean;
  open: boolean;
  onClose: (event: unknown, reason: "backdropClick" | "escapeKeyDown") => void;
}) {
  const { t } = useI18n();

  const {
    event,
    calendar,
    user,
    timezone,
    contextualizedEvent,
    attendanceUser,
    isOwn,
    isWriteDelegated,
    isOrganizer,
    isNotPrivate,
    openUpdateModal,
    setOpenUpdateModal,
    openDuplicateModal,
    setOpenDuplicateModal,
    hidePreview,
    setHidePreview,
    toggleActionMenu,
    setToggleActionMenu,
    openEditModePopup,
    setOpenEditModePopup,
    setTypeOfAction,
    afterChoiceFunc,
    setAfterChoiceFunc,
    resolvedTypeOfAction,
    handleEditClick,
    handleDeleteClick,
    handleDuplicateClick,
  } = useEventPreviewState(eventId, calId, tempEvent, open, onClose);

  useEffect(
    () => {
      if (open && (!event || !calendar)) {
        onClose({}, "backdropClick");
      }
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, event, calendar]
  );

  if (!user || !event || !calendar) return null;

  return (
    <>
      <ResponsiveDialog
        open={open && !hidePreview}
        onClose={() => onClose({}, "backdropClick")}
        showHeaderActions={false}
        actionsBorderTop={
          !!(event.attendee?.find((p) => p.cal_address === user.email) && isOwn)
        }
        actionsJustifyContent="center"
        style={{ overflow: "auto" }}
        title={
          <EventPreviewHeader
            event={event}
            eventId={eventId}
            isOrganizer={isOrganizer}
            isOwn={isOwn}
            isWriteDelegated={isWriteDelegated}
            isNotPrivate={isNotPrivate}
            onClose={() => onClose({}, "backdropClick")}
            onEdit={handleEditClick}
            onMoreClick={(e) => setToggleActionMenu(e.currentTarget)}
          />
        }
        actions={
          contextualizedEvent && (
            <AttendanceValidation
              contextualizedEvent={contextualizedEvent}
              user={attendanceUser}
              setAfterChoiceFunc={setAfterChoiceFunc}
              setOpenEditModePopup={setOpenEditModePopup}
            />
          )
        }
      >
        {/* Title & date row */}
        <Box mb={3}>
          <Box
            display="flex"
            flexDirection="row"
            alignItems="center"
            gap={1}
            mb={1}
          >
            {event.class === "PRIVATE" &&
              (isOwn ? (
                <Tooltip
                  title={t("eventPreview.privateEvent.tooltipOwn")}
                  placement="top"
                >
                  <LockOutlineIcon />
                </Tooltip>
              ) : (
                <LockOutlineIcon />
              ))}
            <Typography
              variant="h5"
              sx={{
                fontSize: "24px",
                fontWeight: 600,
                wordBreak: "break-word",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {formatEventChipTitle(event, t)}
            </Typography>
            {event.transp === "TRANSPARENT" && (
              <Tooltip title={t("eventPreview.free.tooltip")} placement="top">
                <Chip
                  icon={<CircleIcon color="success" fontSize="small" />}
                  label={t("eventPreview.free.label")}
                />
              </Tooltip>
            )}
          </Box>
          <Typography color="text.secondaryContainer">
            {formatDate(event.start, t, timezone, event.allday)}
            {event.end &&
              formatEnd(event.start, event.end, t, timezone, event.allday) &&
              ` – ${formatEnd(event.start, event.end, t, timezone, event.allday)} ${!event.allday ? getTimezoneOffset(timezone, new Date(event.start)) : ""}`}
          </Typography>
        </Box>

        {/* Event details (attendees, location, description, etc.) */}
        <EventPreviewDetails
          event={event}
          isOwn={isOwn}
          isNotPrivate={isNotPrivate}
        />

        {/* Calendar label */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 2 }}>
          <CalendarName calendar={calendar} />
        </Box>
      </ResponsiveDialog>

      {/* Action menu (more vert) */}
      <EventPreviewActionMenu
        anchorEl={toggleActionMenu}
        event={event}
        userEmail={user.email}
        isOwn={isOwn}
        isWriteDelegated={isWriteDelegated}
        onClose={() => setToggleActionMenu(null)}
        onDuplicate={handleDuplicateClick}
        onDelete={handleDeleteClick}
      />

      {/* Recurring edit/delete mode picker */}
      <EditModeDialog
        type={openEditModePopup}
        setOpen={setOpenEditModePopup}
        eventAction={(type: "solo" | "all" | undefined) => {
          setTypeOfAction(type);
          afterChoiceFunc?.(type);
        }}
      />

      {/* Edit modal */}
      <EventUpdateModal
        open={openUpdateModal}
        onClose={() => {
          setOpenUpdateModal(false);
          setHidePreview(false);
        }}
        onCloseAll={() => {
          setOpenUpdateModal(false);
          onClose({}, "backdropClick");
        }}
        eventId={eventId}
        calId={calId}
        typeOfAction={resolvedTypeOfAction}
      />

      {/* Duplicate modal */}
      <EventPopover
        anchorEl={null}
        open={openDuplicateModal}
        selectedRange={
          {
            start: new Date(event.start),
            startStr: event.start,
            end: new Date(event.end ?? event.start),
            endStr: event.end ?? event.start,
            allDay: event.allday ?? false,
          } as DateSelectArg
        }
        setSelectedRange={() => {}}
        calendarRef={{ current: null }}
        onClose={() => {
          setOpenDuplicateModal(false);
          onClose({}, "backdropClick");
        }}
        event={event}
      />
    </>
  );
}
