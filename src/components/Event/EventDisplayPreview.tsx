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
  putEventAsync,
} from "../../features/Calendars/CalendarSlice";
import { dlEvent } from "../../features/Events/EventApi";
import EventDisplayModal from "../../features/Events/EventDisplay";
import { ResponsiveDialog } from "../Dialog";
import EventDuplication from "./EventDuplicate";
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
  const calendar = tempEvent
    ? calendars.templist[calId]
    : calendars.list[calId];
  const event = calendar.events[eventId];
  const user = useAppSelector((state) => state.user);
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const [openFullDisplay, setOpenFullDisplay] = useState(false);
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

  function handleRSVP(rsvp: string) {
    const newEvent = {
      ...event,
      attendee: event.attendee?.map((a) =>
        a.cal_address === user.userData.email ? { ...a, partstat: rsvp } : a
      ),
    };

    dispatch(putEventAsync({ cal: calendar, newEvent }));
    onClose({}, "backdropClick");
  }

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
                        setOpenFullDisplay(!openFullDisplay);
                        await dispatch(getEventAsync(event));
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
                          onClose({}, "backdropClick");
                          dispatch(
                            deleteEventAsync({
                              calId,
                              eventId,
                              eventURL: event.URL,
                            })
                          );
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
                {formatDate(event.start, event.allday)}
                {event.end &&
                  formatEnd(event.start, event.end, event.allday) &&
                  ` – ${formatEnd(event.start, event.end, event.allday)}`}
              </Typography>
            </>
          )
        }
        actions={
          <>
            {currentUserAttendee &&
              event.uid?.split("/")[1] &&
              "event is a reccuring event, the interraction between acceptance and recurrence is broken and to avoid loosing reccuring events by accepting or refusing them this feature isn't available for now"}
            {currentUserAttendee && !event.uid?.split("/")[1] && (
              <Box style={{ display: "flex", flexDirection: "row" }}>
                <Typography variant="body2">Attending?</Typography>
                <ButtonGroup size="small" fullWidth>
                  <Button
                    color={
                      currentUserAttendee?.partstat === "ACCEPTED"
                        ? "success"
                        : "primary"
                    }
                    onClick={() => handleRSVP("ACCEPTED")}
                  >
                    Accept
                  </Button>
                  <Button
                    color={
                      currentUserAttendee?.partstat === "TENTATIVE"
                        ? "warning"
                        : "primary"
                    }
                    onClick={() => handleRSVP("TENTATIVE")}
                  >
                    Maybe
                  </Button>
                  <Button
                    color={
                      currentUserAttendee?.partstat === "DECLINED"
                        ? "error"
                        : "primary"
                    }
                    onClick={() => handleRSVP("DECLINED")}
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
      <EventDisplayModal
        open={openFullDisplay}
        onClose={() => setOpenFullDisplay(false)}
        eventId={eventId}
        calId={calId}
      />
    </>
  );
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
