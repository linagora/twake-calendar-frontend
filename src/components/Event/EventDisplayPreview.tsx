import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CircleIcon from "@mui/icons-material/Circle";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import SubjectIcon from "@mui/icons-material/Subject";
import VideocamIcon from "@mui/icons-material/Videocam";
import {
  Box,
  Button,
  ButtonGroup,
  DialogActions,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import AvatarGroup from "@mui/material/AvatarGroup";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  deleteEventAsync,
  getEventAsync,
} from "../../features/Calendars/CalendarSlice";
import { dlEvent } from "../../features/Events/EventApi";
import EventDisplayModal from "../../features/Events/EventDisplay";
import { getTimezoneOffset } from "../Calendar/TimezoneSelector";
import { ResponsiveDialog } from "../Dialog";
import { EditModeDialog } from "./EditModeDialog";
import EventDuplication from "./EventDuplicate";
import { handleDelete, handleRSVP } from "./eventHandlers/eventHandlers";
import { InfoRow } from "./InfoRow";
import { renderAttendeeBadge } from "./utils/eventUtils";
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
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const [openFullDisplay, setOpenFullDisplay] = useState(false);
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

  return (
    <>
      <ResponsiveDialog
        open={open}
        onClose={() => onClose({}, "backdropClick")}
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
                  {user.userData.email === event.organizer?.cal_address && (
                    <IconButton
                      size="small"
                      onClick={async () => {
                        if (isRecurring) {
                          setAfterChoiceFunc(() => async () => {
                            await dispatch(getEventAsync(event));
                            setOpenFullDisplay(!openFullDisplay);
                          });
                          setOpenEditModePopup("edit");
                        } else {
                          await dispatch(getEventAsync(event));
                          setOpenFullDisplay(!openFullDisplay);
                        }
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={(e) => setToggleActionMenu(e.currentTarget)}
                  >
                    <MoreVertIcon />
                  </IconButton>
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
                    <EventDuplication event={event} onClose={onClose} />
                    {user.userData.email === event.organizer?.cal_address && (
                      <MenuItem
                        onClick={() => {
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
                            dispatch(
                              deleteEventAsync({
                                calId,
                                eventId,
                                eventURL: event.URL,
                              })
                            );
                          }
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
              <Typography
                variant="inherit"
                fontWeight="bold"
                style={{
                  wordBreak: "break-word",
                }}
                gutterBottom
              >
                {event.title}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {formatDate(event.start, timezone, event.allday)}
                {event.end &&
                  formatEnd(event.start, event.end, timezone, event.allday) &&
                  ` – ${formatEnd(event.start, event.end, timezone, event.allday)} ${!event.allday && getTimezoneOffset(timezone)}`}
              </Typography>
            </>
          )
        }
        actions={
          <>
            {currentUserAttendee && (
              <Box style={{ display: "flex", flexDirection: "row" }}>
                <Typography variant="body2">Attending?</Typography>
                <ButtonGroup size="small" fullWidth>
                  <Button
                    color={
                      currentUserAttendee?.partstat === "ACCEPTED"
                        ? "success"
                        : "primary"
                    }
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
                    color={
                      currentUserAttendee?.partstat === "TENTATIVE"
                        ? "warning"
                        : "primary"
                    }
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
                    color={
                      currentUserAttendee?.partstat === "DECLINED"
                        ? "error"
                        : "primary"
                    }
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
                </ButtonGroup>
              </Box>
            )}
          </>
        }
      >
        {/* Video */}
        {event.x_openpass_videoconference && (
          <InfoRow
            icon={<VideocamIcon style={{ fontSize: 18 }} />}
            content={
              <Button
                variant="contained"
                onClick={() => window.open(event.x_openpass_videoconference)}
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
              icon={<PeopleAltOutlinedIcon />}
              content={
                <Box
                  style={{
                    marginBottom: 1,
                    display: "flex",
                    flexDirection: "row",
                  }}
                >
                  <Box>
                    <Typography>{attendees.length} guests</Typography>
                    <Typography>
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
                          showAllAttendees,
                          true
                        )}
                      {visibleAttendees.map((a, idx) =>
                        renderAttendeeBadge(a, idx.toString(), showAllAttendees)
                      )}
                    </AvatarGroup>
                  )}
                  <Typography
                    variant="body2"
                    color="primary"
                    style={{ cursor: "pointer", marginTop: 0.5 }}
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
          renderAttendeeBadge(organizer, "org", showAllAttendees, true)}
        {showAllAttendees &&
          visibleAttendees.map((a, idx) =>
            renderAttendeeBadge(a, idx.toString(), showAllAttendees)
          )}
        {/* Location */}
        {event.location && (
          <InfoRow icon={<LocationOnOutlinedIcon />} text={event.location} />
        )}
        {/* Description */}
        {event.description && (
          <InfoRow icon={<SubjectIcon />} text={event.description} />
        )}

        {/* Description */}
        {event.alarm && (
          <InfoRow
            icon={<NotificationsNoneIcon />}
            text={`${event.alarm.trigger} before by ${event.alarm.action}`}
          />
        )}

        {/* Error */}
        {event.error && (
          <InfoRow
            icon={<ErrorOutlineIcon color="error" style={{ fontSize: 18 }} />}
            text={event.error}
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
          <CalendarTodayIcon style={{ fontSize: 16 }} />
          <CircleIcon
            style={{
              color: calendar.color ?? "#3788D8",
              width: 12,
              height: 12,
            }}
          />
          <Typography variant="body2">{calendar.name}</Typography>
        </Box>

        {currentUserAttendee && !event.repetition && (
          <>
            <Divider variant="fullWidth" />
          </>
        )}
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
    </>
  );
}

function formatDate(date: Date | string, timeZone?: string, allday?: boolean) {
  if (allday) {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      weekday: "long",
      day: "numeric",
      timeZone,
    });
  } else {
    return new Date(date).toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      weekday: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    });
  }
}

function formatEnd(
  start: Date | string,
  end: Date | string,
  timeZone?: string,
  allday?: boolean
) {
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
          timeZone,
        });
  } else {
    if (sameDay) {
      return endDate.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
      });
    }
    return endDate.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    });
  }
}
