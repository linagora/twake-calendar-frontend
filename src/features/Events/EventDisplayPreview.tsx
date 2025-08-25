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
  Avatar,
  Badge,
  PopoverPosition,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import VideocamIcon from "@mui/icons-material/Videocam";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CircleIcon from "@mui/icons-material/Circle";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { userAttendee } from "../User/userDataTypes";
import EventDisplayModal from "./EventDisplay";

export default function EventPreviewModal({
  eventId,
  calId,
  anchorPosition,
  open,
  onClose,
}: {
  eventId: string;
  calId: string;
  anchorPosition: PopoverPosition | null;
  open: boolean;
  onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
}) {
  const dispatch = useAppDispatch();
  const calendar = useAppSelector((state) => state.calendars.list[calId]);
  const event = useAppSelector(
    (state) => state.calendars.list[calId]?.events[eventId]
  );
  const user = useAppSelector((state) => state.user);
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const [openFullDisplay, setOpenFullDisplay] = useState(false);
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
      <Popover
        open={open}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition ?? undefined}
        onClose={onClose}
      >
        <Card sx={{ width: 300, p: 2, position: "relative" }}>
          {/* Top-right buttons */}
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              display: "flex",
              gap: 1,
            }}
          >
            {user.userData.email !== event.organizer?.cal_address && (
              <IconButton
                size="small"
                onClick={() => {
                  setOpenFullDisplay(!openFullDisplay);
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            )}
            {user.userData.email === event.organizer?.cal_address && (
              <>
                <IconButton
                  size="small"
                  onClick={() => {
                    setOpenFullDisplay(!openFullDisplay);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    onClose({}, "backdropClick");
                    dispatch(
                      deleteEventAsync({ calId, eventId, eventURL: event.URL })
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

          <CardContent sx={{ pt: 1.5 }}>
            {event.title && (
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {event.title}
              </Typography>
            )}

            {/* Time info*/}
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {formatDate(event.start)}
              {event.end &&
                ` – ${new Date(event.end).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
            </Typography>

            {/* Location */}
            {event.location && (
              <InfoRow
                icon={<LocationOnIcon sx={{ fontSize: 18 }} />}
                text={event.location}
              />
            )}

            {/* Video */}
            {event.x_openpass_videoconference && (
              <InfoRow
                icon={<VideocamIcon sx={{ fontSize: 18 }} />}
                text="Video conference available"
              />
            )}

            {/* Attendees */}
            {event.attendee?.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Attendees:</Typography>
                {organizer && renderAttendeeBadge(organizer, "org", true)}
                {visibleAttendees.map((a, idx) =>
                  renderAttendeeBadge(a, idx.toString())
                )}
                {attendees.length > attendeeDisplayLimit && (
                  <Typography
                    variant="body2"
                    color="primary"
                    sx={{ cursor: "pointer", mt: 0.5 }}
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
            {event.error && (
              <InfoRow
                icon={<ErrorOutlineIcon color="error" sx={{ fontSize: 18 }} />}
                text={event.error}
                error
              />
            )}

            {/* Calendar color dot */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <CalendarTodayIcon sx={{ fontSize: 16 }} />
              <CircleIcon
                sx={{
                  color: calendar.color ?? "#3788D8",
                  width: 12,
                  height: 12,
                }}
              />
              <Typography variant="body2">{calendar.name}</Typography>
            </Box>

            <Divider sx={{ mb: 1 }} />

            {/* RSVP */}
            {currentUserAttendee && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
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
            {event.description && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {event.description}
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
      />
    </>
  );
}

function InfoRow({
  icon,
  text,
  error = false,
}: {
  icon: React.ReactNode;
  text: string;
  error?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
      {icon}
      <Typography variant="body2" color={error ? "error" : "textPrimary"}>
        {text}
      </Typography>
    </Box>
  );
}

function renderAttendeeBadge(
  a: userAttendee,
  key: string,
  isOrganizer?: boolean
) {
  const statusIcon =
    a.partstat === "ACCEPTED" ? (
      <CheckCircleIcon fontSize="inherit" color="success" />
    ) : a.partstat === "DECLINED" ? (
      <CancelIcon fontSize="inherit" color="error" />
    ) : null;

  return (
    <Box
      key={key}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        mb: 0.5,
        p: 0.5,
        borderRadius: 1,
      }}
    >
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        badgeContent={
          statusIcon && (
            <Box
              sx={{
                fontSize: 14,
                lineHeight: 0,
                backgroundColor: "white",
                borderRadius: "50%",
                padding: "1px",
              }}
            >
              {statusIcon}
            </Box>
          )
        }
      >
        <Avatar {...stringAvatar(a.cn || a.cal_address)} />
      </Badge>
      <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Typography
          variant="body2"
          noWrap
          sx={{
            maxWidth: "180px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {a.cn || a.cal_address}
        </Typography>
        {isOrganizer && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: "italic" }}
          >
            Organizer
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function formatDate(date: Date) {
  return new Date(date).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }

  return color;
}

function stringAvatar(name: string) {
  return {
    sx: { width: 24, height: 24, fontSize: 18, bgcolor: stringToColor(name) },
    children: name[0],
  };
}
