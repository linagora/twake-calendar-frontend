import { useEffect, useState } from "react";
import { deleteEventAsync, putEventAsync } from "../Calendars/CalendarSlice";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  Popover,
  Button,
  Box,
  Typography,
  ButtonGroup,
  Card,
  CardContent,
  Divider,
  IconButton,
  PopoverPosition,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import EmailIcon from "@mui/icons-material/Email";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import VideocamIcon from "@mui/icons-material/Videocam";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CircleIcon from "@mui/icons-material/Circle";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import EventDisplayModal, {
  InfoRow,
  renderAttendeeBadge,
} from "./EventDisplay";
import EventUpdateModal from "./EventUpdateModal";
import { dlEvent, getEvent } from "./EventApi";
import EventDuplication from "../../components/Event/EventDuplicate";
import { CalendarEvent } from "./EventsTypes";

export default function EventPreviewModal({
  eventId,
  calId,
  tempEvent,
  anchorPosition,
  open,
  onClose,
}: {
  eventId: string;
  calId: string;
  tempEvent?: boolean;
  anchorPosition: PopoverPosition | null;
  open: boolean;
  onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
}) {
  const dispatch = useAppDispatch();
  const calendars = useAppSelector((state) => state.calendars);
  const calendar = tempEvent
    ? calendars.templist[calId]
    : calendars.list[calId];
  const cachedEvent = calendar.events[eventId];
  const user = useAppSelector((state) => state.user);

  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const [openFullDisplay, setOpenFullDisplay] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const mailSpaUrl = (window as any).MAIL_SPA_URL ?? null;

  // State for fresh event data
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);

  // Initialize with cached data immediately, then fetch fresh data
  useEffect(() => {
    if (open && cachedEvent) {
      // Show cached data immediately
      setCurrentEvent(cachedEvent);

      // Fetch fresh data in background (only for non-temp events)
      if (!tempEvent) {
        const fetchFreshData = async () => {
          try {
            const freshData = await getEvent(cachedEvent);
            setCurrentEvent(freshData);
          } catch (err) {
            // Keep using cached data if API fails
          }
        };

        fetchFreshData();
      }
    } else if (!open) {
      // Reset when popup closes
      setCurrentEvent(null);
    }
  }, [open, cachedEvent, eventId, calId, tempEvent]);

  useEffect(() => {
    // Only close if calendar is missing
    if (!calendar) {
      onClose({}, "backdropClick");
    }
  }, [calendar, onClose]);

  if (!calendar || !currentEvent) return null;

  const attendeeDisplayLimit = 3;

  const attendees =
    currentEvent.attendee?.filter(
      (a) => a.cal_address !== currentEvent.organizer?.cal_address
    ) || [];

  const visibleAttendees = showAllAttendees
    ? attendees
    : attendees.slice(0, attendeeDisplayLimit);

  const currentUserAttendee = currentEvent.attendee?.find(
    (person) => person.cal_address === user.userData.email
  );

  const organizer = currentEvent.attendee?.find(
    (a) => a.cal_address === currentEvent.organizer?.cal_address
  );

  function handleRSVP(rsvp: string) {
    if (!currentEvent) return;

    const newEvent: CalendarEvent = {
      ...currentEvent,
      attendee: currentEvent.attendee?.map((a) =>
        a.cal_address === user.userData.email ? { ...a, partstat: rsvp } : a
      ),
    };

    dispatch(putEventAsync({ cal: calendar, newEvent }));
    onClose({}, "backdropClick");
  }

  return (
    <>
      <Popover
        open={open}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition ?? undefined}
        onClose={onClose}
      >
        <Card style={{ width: 300, padding: 16, position: "relative" }}>
          {/* Top-right buttons */}
          <Box
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              display: "flex",
              gap: 8,
            }}
          >
            {(window as any).DEBUG && (
              <IconButton
                onClick={async () => {
                  const icsContent = await dlEvent(currentEvent);
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
            <EventDuplication event={currentEvent} onClose={onClose} />
            {mailSpaUrl && attendees.length > 0 && (
              <IconButton
                size="small"
                onClick={() =>
                  window.open(
                    `${mailSpaUrl}/mailto/?uri=mailto:${currentEvent.attendee
                      .map((a) => a.cal_address)
                      .filter((mail) => mail !== user.userData.email)
                      .join(",")}?subject=${currentEvent.title}`
                  )
                }
              >
                <EmailIcon fontSize="small" />
              </IconButton>
            )}
            {user.userData.email !== currentEvent.organizer?.cal_address && (
              <IconButton
                size="small"
                onClick={() => {
                  setOpenFullDisplay(!openFullDisplay);
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            )}
            {user.userData.email === currentEvent.organizer?.cal_address && (
              <>
                <IconButton
                  size="small"
                  data-testid="edit-button"
                  onClick={() => {
                    setOpenUpdateModal(true);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    onClose({}, "backdropClick");
                    dispatch(
                      deleteEventAsync({
                        calId,
                        eventId,
                        eventURL: currentEvent.URL,
                      })
                    );
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </>
            )}
            <IconButton
              size="small"
              onClick={() => onClose({}, "backdropClick")}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <CardContent style={{ paddingTop: 12 }}>
            {currentEvent.title && (
              <Typography
                variant="h6"
                fontWeight="bold"
                style={{
                  wordBreak: "break-word",
                }}
                gutterBottom
              >
                {currentEvent.title}
              </Typography>
            )}

            {/* Time info*/}
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {formatDate(new Date(currentEvent.start), currentEvent.allday)}
              {currentEvent.end &&
                formatEnd(
                  new Date(currentEvent.start),
                  new Date(currentEvent.end),
                  currentEvent.allday
                ) &&
                ` – ${formatEnd(new Date(currentEvent.start), new Date(currentEvent.end), currentEvent.allday)}`}
            </Typography>

            {/* Location */}
            {currentEvent.location && (
              <InfoRow
                icon={<LocationOnIcon style={{ fontSize: 18 }} />}
                text={currentEvent.location}
              />
            )}

            {/* Video */}
            {currentEvent.x_openpass_videoconference && (
              <InfoRow
                icon={<VideocamIcon style={{ fontSize: 18 }} />}
                text="Video conference available"
                data={currentEvent.x_openpass_videoconference}
              />
            )}

            {/* Attendees */}
            {currentEvent.attendee?.length > 0 && (
              <Box style={{ marginBottom: 8 }}>
                <Typography variant="subtitle2">Attendees:</Typography>
                {organizer && renderAttendeeBadge(organizer, "org", true)}
                {visibleAttendees.map((a, idx) =>
                  renderAttendeeBadge(a, idx.toString())
                )}
                {attendees.length > attendeeDisplayLimit && (
                  <Typography
                    variant="body2"
                    color="primary"
                    style={{ cursor: "pointer", marginTop: 4 }}
                    onClick={() => setShowAllAttendees(!showAllAttendees)}
                  >
                    {showAllAttendees
                      ? "Show less"
                      : `Show more (${
                          attendees.length - attendeeDisplayLimit
                        } more)`}
                  </Typography>
                )}
              </Box>
            )}

            {/* Error */}
            {currentEvent.error && (
              <InfoRow
                icon={
                  <ErrorOutlineIcon color="error" style={{ fontSize: 18 }} />
                }
                text={currentEvent.error}
                error
              />
            )}

            {/* Calendar color dot */}
            <Box
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
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

            <Divider style={{ marginBottom: 8 }} />

            {/* RSVP */}
            {currentUserAttendee && (
              <Box>
                <Typography variant="body2" style={{ marginBottom: 8 }}>
                  Will you attend?
                </Typography>
                <ButtonGroup size="small" fullWidth>
                  <Button
                    color={
                      currentUserAttendee.partstat === "ACCEPTED"
                        ? "success"
                        : "primary"
                    }
                    onClick={() => handleRSVP("ACCEPTED")}
                  >
                    Accept
                  </Button>
                  <Button
                    color={
                      currentUserAttendee.partstat === "TENTATIVE"
                        ? "warning"
                        : "primary"
                    }
                    onClick={() => handleRSVP("TENTATIVE")}
                  >
                    Maybe
                  </Button>
                  <Button
                    color={
                      currentUserAttendee.partstat === "DECLINED"
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

            {/* Description */}
            {currentEvent.description && (
              <Typography variant="body2" style={{ marginTop: 8 }}>
                {currentEvent.description}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Popover>
      <EventDisplayModal
        open={openFullDisplay}
        onClose={() => setOpenFullDisplay(false)}
        eventId={eventId}
        calId={calId}
        eventData={currentEvent}
      />
      <EventUpdateModal
        eventId={eventId}
        calId={calId}
        open={openUpdateModal}
        onClose={() => setOpenUpdateModal(false)}
        eventData={currentEvent}
      />
    </>
  );
}

function formatDate(date: Date, allday?: boolean) {
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

function formatEnd(start: Date, end: Date, allday?: boolean) {
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
