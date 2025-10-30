import { DateSelectArg } from "@fullcalendar/core";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CircleIcon from "@mui/icons-material/Circle";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import RepeatIcon from "@mui/icons-material/Repeat";
import SubjectIcon from "@mui/icons-material/Subject";
import VideocamIcon from "@mui/icons-material/Videocam";
import { Box, Typography } from "@mui/material";
import EventPopover from "./EventModal";
import {
  Button,
  Chip,
  DialogActions,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import AvatarGroup from "@mui/material/AvatarGroup";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { CalendarName } from "../../components/Calendar/CalendarName";
import { getTimezoneOffset } from "../../components/Calendar/TimezoneSelector";
import { updateTempCalendar } from "../../components/Calendar/utils/calendarUtils";
import ResponsiveDialog from "../../components/Dialog/ResponsiveDialog";
import { EditModeDialog } from "../../components/Event/EditModeDialog";
import EventDuplication from "../../components/Event/EventDuplicate";
import {
  handleDelete,
  handleRSVP,
} from "../../components/Event/eventHandlers/eventHandlers";
import { InfoRow } from "../../components/Event/InfoRow";
import { renderAttendeeBadge } from "../../components/Event/utils/eventUtils";
import { getCalendarRange } from "../../utils/dateUtils";
import { deleteEventAsync } from "../Calendars/CalendarSlice";
import { dlEvent } from "./EventApi";
import EventDisplayModal from "./EventDisplay";
import { CalendarEvent } from "./EventsTypes";
import EventUpdateModal from "./EventUpdateModal";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
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
  onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
}) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const calendars = useAppSelector((state) => state.calendars);
  const timezone =
    useAppSelector((state) => state.calendars.timeZone) ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const calendarList = Object.values(
    useAppSelector((state) => state.calendars.list)
  );
  const calendar = tempEvent
    ? calendars.templist[calId]
    : calendars.list[calId];
  const event = calendar.events[eventId];
  const user = useAppSelector((state) => state.user);

  const isRecurring = event?.uid?.includes("/");
  const isOwn = calendar.ownerEmails?.includes(user.userData.email);
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const [openFullDisplay, setOpenFullDisplay] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [openDuplicateModal, setOpenDuplicateModal] = useState(false);
  const [hidePreview, setHidePreview] = useState(false);
  const [openEditModePopup, setOpenEditModePopup] = useState<string | null>(
    null
  );
  const [typeOfAction, setTypeOfAction] = useState<"solo" | "all" | undefined>(
    undefined
  );
  const [afterChoiceFunc, setAfterChoiceFunc] = useState<Function>();

  const [toggleActionMenu, setToggleActionMenu] = useState<Element | null>(
    null
  );
  const mailSpaUrl = (window as any).MAIL_SPA_URL ?? null;

  useEffect(() => {
    if (!event || !calendar) {
      onClose({}, "backdropClick");
    }
  }, [event, calendar, onClose]);

  if (!event || !calendar) return null;

  const attendeeDisplayLimit = 3;

  const attendees =
    event.attendee?.filter(
      (a) => a.cal_address !== event.organizer?.cal_address
    ) || [];

  const visibleAttendees = showAllAttendees
    ? attendees
    : attendees.slice(0, attendeeDisplayLimit);

  const currentUserAttendee = event.attendee?.find(
    (person) => person.cal_address === user.userData.email
  );

  const organizer = event.attendee?.find(
    (a) => a.cal_address === event.organizer?.cal_address
  );

  const updateTempList = async () => {
    if (calendars.templist) {
      const calendarRange = getCalendarRange(new Date(event.start));
      await updateTempCalendar(
        calendars.templist,
        event,
        dispatch,
        calendarRange
      );
    }
  };

  return (
    <>
      <ResponsiveDialog
        open={open && !hidePreview}
        onClose={() => onClose({}, "backdropClick")}
        showHeaderActions={false}
        actionsBorderTop={true}
        actionsJustifyContent="center"
        style={{ overflow: "auto" }}
        title={
          event.title && (
            <>
              <DialogActions>
                <Box>
                  {(window as any).DEBUG && (
                    <IconButton
                      onClick={async () => {
                        const icsContent = await dlEvent(event);
                        const blob = new Blob([icsContent], {
                          type: "text/calendar",
                        });
                        const url = URL.createObjectURL(blob);

                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `${eventId}.ics`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <FileDownloadOutlinedIcon />
                    </IconButton>
                  )}
                  {user.userData.email === event.organizer?.cal_address &&
                    calendar.ownerEmails?.includes(user.userData.email) && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (isRecurring) {
                            setAfterChoiceFunc(() => () => {
                              setHidePreview(true);
                              setOpenUpdateModal(true);
                            });
                            setOpenEditModePopup("edit");
                          } else {
                            setHidePreview(true);
                            setOpenUpdateModal(true);
                          }
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                  {((event.class !== "PRIVATE" && !isOwn) || isOwn) && (
                    <IconButton
                      size="small"
                      onClick={(e) => setToggleActionMenu(e.currentTarget)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                  <Menu
                    open={Boolean(toggleActionMenu)}
                    onClose={() => setToggleActionMenu(null)}
                    anchorEl={toggleActionMenu}
                  >
                    {mailSpaUrl && attendees.length > 0 && (
                      <MenuItem
                        onClick={() =>
                          window.open(
                            `${mailSpaUrl}/mailto/?uri=mailto:${event.attendee
                              .map((a) => a.cal_address)
                              .filter((mail) => mail !== user.userData.email)
                              .join(",")}?subject=${event.title}`
                          )
                        }
                      >
                        Email attendees
                      </MenuItem>
                    )}
                    <EventDuplication
                      event={event}
                      onClose={() => setToggleActionMenu(null)}
                      onOpenDuplicate={() => {
                        setToggleActionMenu(null);
                        setHidePreview(true);
                        setOpenDuplicateModal(true);
                      }}
                    />
                    {user.userData.email === event.organizer?.cal_address && (
                      <MenuItem
                        onClick={async () => {
                          if (isRecurring) {
                            setAfterChoiceFunc(
                              () =>
                                (typeOfAction?: "solo" | "all" | undefined) =>
                                  handleDelete(
                                    isRecurring,
                                    typeOfAction,
                                    onClose,
                                    dispatch,
                                    calendar,
                                    event,
                                    calId,
                                    eventId
                                  )
                            );
                            setOpenEditModePopup("edit");
                          } else {
                            onClose({}, "backdropClick");
                            await dispatch(
                              deleteEventAsync({
                                calId,
                                eventId,
                                eventURL: event.URL,
                              })
                            );
                          }
                          updateTempList();
                        }}
                      >
                        Delete event
                      </MenuItem>
                    )}
                  </Menu>
                  <IconButton
                    size="small"
                    onClick={() => onClose({}, "backdropClick")}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              </DialogActions>
              <Box display="flex" flexDirection="row">
                {event.class === "PRIVATE" &&
                  (isOwn ? (
                    <Tooltip
                      title={
                        "Only you and attendees can see the details of this event."
                      }
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
                  gutterBottom
                >
                  {event.title}
                </Typography>
                {event.transp === "TRANSPARENT" && (
                  <Tooltip
                    title={
                      "Others see you as available during the time range of this event."
                    }
                    placement="top"
                  >
                    <Chip
                      icon={<CircleIcon color="success" fontSize="small" />}
                      label="Free"
                    />
                  </Tooltip>
                )}
              </Box>
              <Typography color="text.secondaryContainer" gutterBottom>
                {formatDate(event.start, event.allday)}
                {event.end &&
                  formatEnd(event.start, event.end, event.allday) &&
                  ` – ${formatEnd(event.start, event.end, event.allday)} ${!event.allday && getTimezoneOffset(timezone)}`}
              </Typography>
            </>
          )
        }
        actions={
          <>
            {currentUserAttendee && (
              <>
                <Typography sx={{ marginRight: 2 }}>Attending?</Typography>
                <Box display="flex" gap="15px" alignItems="center">
                  <Button
                    variant={
                      currentUserAttendee?.partstat === "ACCEPTED"
                        ? "contained"
                        : "outlined"
                    }
                    color={
                      currentUserAttendee?.partstat === "ACCEPTED"
                        ? "success"
                        : "primary"
                    }
                    size="large"
                    sx={{ borderRadius: "50px" }}
                    onClick={() => {
                      if (isRecurring) {
                        setAfterChoiceFunc(
                          () => (type: string) =>
                            handleRSVP(
                              dispatch,
                              calendar,
                              user,
                              event,
                              "ACCEPTED",

                              onClose,
                              type,
                              calendarList
                            )
                        );
                        setOpenEditModePopup("attendance");
                      } else {
                        handleRSVP(
                          dispatch,
                          calendar,
                          user,
                          event,
                          "ACCEPTED",
                          onClose
                        );
                      }
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    variant={
                      currentUserAttendee?.partstat === "TENTATIVE"
                        ? "contained"
                        : "outlined"
                    }
                    color={
                      currentUserAttendee?.partstat === "TENTATIVE"
                        ? "warning"
                        : "primary"
                    }
                    size="large"
                    sx={{ borderRadius: "50px" }}
                    onClick={() => {
                      if (isRecurring) {
                        setAfterChoiceFunc(
                          () => (type: string) =>
                            handleRSVP(
                              dispatch,
                              calendar,
                              user,
                              event,
                              "TENTATIVE",
                              onClose,
                              type,
                              calendarList
                            )
                        );
                        setOpenEditModePopup("attendance");
                      } else {
                        handleRSVP(
                          dispatch,
                          calendar,
                          user,
                          event,
                          "TENTATIVE",
                          onClose
                        );
                      }
                    }}
                  >
                    Maybe
                  </Button>
                  <Button
                    variant={
                      currentUserAttendee?.partstat === "DECLINED"
                        ? "contained"
                        : "outlined"
                    }
                    color={
                      currentUserAttendee?.partstat === "DECLINED"
                        ? "error"
                        : "primary"
                    }
                    size="large"
                    sx={{ borderRadius: "50px" }}
                    onClick={() => {
                      if (isRecurring) {
                        setAfterChoiceFunc(
                          () => (type: string) =>
                            handleRSVP(
                              dispatch,
                              calendar,
                              user,
                              event,
                              "DECLINED",
                              onClose,
                              type,
                              calendarList
                            )
                        );
                        setOpenEditModePopup("attendance");
                      } else {
                        handleRSVP(
                          dispatch,
                          calendar,
                          user,
                          event,
                          "DECLINED",
                          onClose
                        );
                      }
                    }}
                  >
                    Decline
                  </Button>
                </Box>
              </>
            )}
          </>
        }
      >
        {((event.class !== "PRIVATE" && !isOwn) || isOwn) && (
          <>
            {/* Video */}
            {event.x_openpass_videoconference && (
              <InfoRow
                icon={
                  <Box sx={{ minWidth: "25px", marginRight: 2 }}>
                    <VideocamIcon />
                  </Box>
                }
                content={
                  <Button
                    variant="contained"
                    onClick={() =>
                      window.open(event.x_openpass_videoconference)
                    }
                  >
                    Join the video conference
                  </Button>
                }
              />
            )}
            {/* Attendees */}
            {attendees?.length > 0 && (
              <>
                <InfoRow
                  icon={
                    <Box sx={{ minWidth: "25px", marginRight: 2 }}>
                      <PeopleAltOutlinedIcon />
                    </Box>
                  }
                  content={
                    <Box
                      style={{
                        marginBottom: 1,
                        display: "flex",
                        flexDirection: "row",
                      }}
                    >
                      <Box sx={{ marginRight: 2 }}>
                        <Typography>{attendees.length} guests</Typography>
                        <Typography
                          sx={{ fontSize: "13px", color: "text.secondary" }}
                        >
                          {
                            attendees.filter((a) => a.partstat === "ACCEPTED")
                              .length
                          }{" "}
                          yes,{" "}
                          {
                            attendees.filter((a) => a.partstat === "DECLINED")
                              .length
                          }{" "}
                          no
                        </Typography>
                      </Box>
                      {!showAllAttendees && (
                        <AvatarGroup max={attendeeDisplayLimit}>
                          {organizer &&
                            renderAttendeeBadge(
                              organizer,
                              "org",
                              t,
                              showAllAttendees,
                              true
                            )}
                          {visibleAttendees.map((a, idx) =>
                            renderAttendeeBadge(
                              a,
                              idx.toString(),
                              t,
                              showAllAttendees
                            )
                          )}
                        </AvatarGroup>
                      )}
                      <Typography
                        sx={{
                          cursor: "pointer",
                          marginLeft: 2,
                          fontSize: "14px",
                          color: "text.secondary",
                          alignSelf: "center",
                        }}
                        onClick={() => setShowAllAttendees(!showAllAttendees)}
                      >
                        {showAllAttendees ? "Show less" : `Show more `}
                      </Typography>
                    </Box>
                  }
                />
              </>
            )}
            {showAllAttendees &&
              organizer &&
              renderAttendeeBadge(organizer, "org", t, showAllAttendees, true)}
            {showAllAttendees &&
              visibleAttendees.map((a, idx) =>
                renderAttendeeBadge(a, idx.toString(), t, showAllAttendees)
              )}
            {/* Location */}
            {event.location && (
              <InfoRow
                icon={
                  <Box sx={{ minWidth: "25px", marginRight: 2 }}>
                    <LocationOnOutlinedIcon />
                  </Box>
                }
                text={event.location}
                style={{
                  fontSize: "16px",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            )}
            {/* Description */}
            {event.description && (
              <InfoRow
                icon={
                  <Box sx={{ minWidth: "25px", marginRight: 2 }}>
                    <SubjectIcon />
                  </Box>
                }
                text={event.description}
                style={{
                  fontSize: "16px",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            )}
            {/* ALARM */}
            {event.alarm && (
              <InfoRow
                icon={
                  <Box sx={{ minWidth: "25px", marginRight: 2 }}>
                    <NotificationsNoneIcon />
                  </Box>
                }
                text={`${event.alarm.trigger} before by ${event.alarm.action}`}
                style={{
                  fontSize: "16px",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            )}
            {/* Repetition */}
            {event.repetition && (
              <InfoRow
                icon={
                  <Box sx={{ minWidth: "25px", marginRight: 2 }}>
                    <RepeatIcon />
                  </Box>
                }
                text={makeRecurrenceString(event)}
                style={{
                  fontSize: "16px",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            )}
          </>
        )}
        {event.class === "PRIVATE" && !isOwn && (
          <Box
            sx={{
              backgroundColor: "#F3F4F6",
              height: 48,
              borderRadius: "8px",
              gap: "16px",
              paddingTop: "16px",
              paddingBottom: " 16px",
            }}
          >
            <Typography
              fontFamily={"Inter"}
              fontWeight={500}
              fontSize={"12px"}
              lineHeight={"16px"}
              letterSpacing={"0.5px"}
              textAlign={"center"}
            >
              This is a private event. Details are hidden.
            </Typography>
          </Box>
        )}
        {/* Error */}
        {event.error && (
          <InfoRow
            icon={
              <Box sx={{ minWidth: "25px", marginRight: 2 }}>
                <ErrorOutlineIcon color="error" />
              </Box>
            }
            text={event.error}
            style={{
              fontSize: "16px",
              fontFamily: "'Inter', sans-serif",
            }}
            error
          />
        )}
        {/* Calendar color dot */}
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            marginBottom: 2,
          }}
        >
          <Box sx={{ minWidth: "25px", marginRight: 2 }}>
            <CalendarTodayIcon />
          </Box>
          <CalendarName calendar={calendar} />
        </Box>
      </ResponsiveDialog>
      <EditModeDialog
        type={openEditModePopup}
        setOpen={setOpenEditModePopup}
        event={event}
        eventAction={(type: "solo" | "all" | undefined) => {
          setTypeOfAction(type);
          afterChoiceFunc && afterChoiceFunc(type);
        }}
      />
      <EventDisplayModal
        open={openFullDisplay}
        onClose={() => setOpenFullDisplay(false)}
        eventId={eventId}
        calId={calId}
        typeOfAction={typeOfAction}
      />
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
        typeOfAction={typeOfAction}
      />
      <EventPopover
        anchorEl={null}
        open={openDuplicateModal}
        selectedRange={
          {
            start: new Date(event.start),
            startStr: event.start,
            end: new Date(event.end ?? ""),
            endStr: event.end ?? "",
            allDay: event.allday ?? false,
          } as DateSelectArg
        }
        setSelectedRange={() => {}}
        calendarRef={{ current: null }}
        onClose={() => {
          setOpenDuplicateModal(false);
          onClose({}, "backdropClick"); // Đóng cả preview modal
        }}
        event={event}
      />
    </>
  );
}

function makeRecurrenceString(event: CalendarEvent): string | undefined {
  if (!event.repetition) {
    return;
  }
  const recur = [`Recurrent Event · ${event.repetition.freq}`];
  const recurType: Record<string, string> = {
    daily: "days",
    monthly: "months",
    yearly: "years",
  };
  if (event.repetition.byday) {
    recur.push(`on ${event.repetition.byday.join(", ")}`);
  }
  if (event.repetition.interval && event.repetition.interval > 1) {
    recur.push(
      `every ${event.repetition.interval} ${recurType[event.repetition.freq]}`
    );
  }
  if (event.repetition.occurrences) {
    recur.push(`for ${event.repetition.occurrences} occurences`);
  }
  if (event.repetition.endDate) {
    recur.push(`until ${event.repetition.endDate}`);
  }
  return recur.join(", ");
}

function formatDate(date: Date | string, allday?: boolean) {
  if (allday) {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      weekday: "long",
      day: "numeric",
    });
  } else {
    return new Date(date).toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      weekday: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

function formatEnd(start: Date | string, end: Date | string, allday?: boolean) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (allday) {
    return sameDay
      ? null
      : endDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  } else {
    if (sameDay) {
      return endDate.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return endDate.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
