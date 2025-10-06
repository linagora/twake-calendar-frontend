import { useState } from "react";
import {
  deleteEventAsync,
  putEventAsync,
  removeEvent,
} from "../Calendars/CalendarSlice";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AttendeeSelector from "../../components/Attendees/AttendeeSearch";
import {
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
  Modal,
  CardHeader,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  CardActions,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import VideocamIcon from "@mui/icons-material/Videocam";
import CircleIcon from "@mui/icons-material/Circle";
import { userAttendee } from "../User/userDataTypes";
import { Calendars } from "../Calendars/CalendarTypes";
import { CalendarEvent, RepetitionObject } from "./EventsTypes";
import { formatLocalDateTime } from "../../components/Event/EventFormFields";
import RepeatEvent from "../../components/Event/EventRepeat";

export default function EventDisplayModal({
  eventId,
  calId,
  open,
  onClose,
  eventData,
}: {
  eventId: string;
  calId: string;
  open: boolean;
  onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
  eventData?: CalendarEvent | null;
}) {
  const dispatch = useAppDispatch();
  const calendar = useAppSelector((state) => state.calendars.list[calId]);
  const cachedEvent = useAppSelector(
    (state) => state.calendars.list[calId]?.events[eventId]
  );
  const user = useAppSelector((state) => state.user);

  // Use eventData from props if available, otherwise use cached data
  const event = eventData || cachedEvent;

  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const calendars = Object.values(
    useAppSelector((state) => state.calendars.list)
  );

  const userPersonnalCalendars: Calendars[] = calendars.filter(
    (c) => c.id?.split("/")[0] === user.userData?.openpaasId
  );

  // Form state
  const [repetition, setRepetition] = useState<RepetitionObject>(
    event?.repetition ?? ({} as RepetitionObject)
  );
  const [alarm, setAlarm] = useState(event?.alarm?.trigger ?? "");
  const [busy, setBusy] = useState(event?.transp ?? "OPAQUE");
  const [timezone] = useState(event?.timezone ?? "UTC");
  const [calendarid, setCalendarid] = useState(
    calId.split("/")[0] === user.userData?.openpaasId
      ? userPersonnalCalendars.findIndex((cal) => cal.id === calId)
      : calendars.findIndex((cal) => cal.id === calId)
  );

  const [attendees, setAttendees] = useState<userAttendee[]>(
    event?.attendee
      ? event.attendee.filter(
          (a) => a.cal_address !== event.organizer?.cal_address
        )
      : []
  );

  const [showRepeat] = useState(event?.repetition?.freq ? true : false);

  const isOwn = calId.split("/")[0] === user.userData?.openpaasId;
  const isOwnCal = calendar?.id?.split("/")[0] === user.userData?.openpaasId;

  const currentUserAttendee = event?.attendee?.find(
    (a) => a.cal_address === user.userData?.email
  );

  const calList =
    calId.split("/")[0] === user.userData?.openpaasId
      ? userPersonnalCalendars
      : calendars;

  function handleRSVP(rsvp: string) {
    if (!event) return;
    const newEvent = { ...event };
    newEvent.attendee = newEvent.attendee.map((a) =>
      a.cal_address === user.userData?.email ? { ...a, partstat: rsvp } : a
    );
    dispatch(putEventAsync({ cal: calendar, newEvent }));
  }

  const handleSave = async () => {
    if (!event) return;

    const newEvent: CalendarEvent = {
      calId,
      title: event.title,
      URL: event.URL ?? `/calendars/${calId}/${event.uid}.ics`,
      start: event.start,
      end: event.end,
      allday: event.allday,
      uid: event.uid,
      description: event.description,
      location: event.location,
      repetition,
      class: event.class,
      organizer: event.organizer,
      timezone,
      attendee: event.organizer
        ? [event.organizer as userAttendee, ...attendees]
        : attendees,
      transp: busy,
      color: userPersonnalCalendars[calendarid]?.color,
      alarm: { trigger: alarm, action: "EMAIL" },
    };

    const [baseId, recurrenceId] = event.uid.split("/");
    if (recurrenceId) {
      Object.keys(userPersonnalCalendars[calendarid].events).forEach(
        (element) => {
          if (element.split("/")[0] === baseId) {
            dispatch(removeEvent({ calendarUid: calId, eventUid: element }));
          }
        }
      );
    }
    await dispatch(
      putEventAsync({
        cal: userPersonnalCalendars[calendarid],
        newEvent,
      })
    );

    onClose({}, "backdropClick");
  };

  const handleToggleShowMore = async () => {
    setShowMore(!showMore);
  };

  function getEventColor() {
    if (!event) return "#1976d2";
    const color = event.color || calendar?.color || "#1976d2";
    return color;
  }

  if (!event) return null;

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          style={{
            position: "absolute",
            top: "5vh",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            maxWidth: "600px",
            maxHeight: "90vh",
            overflow: "auto",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          <Card>
            <CardHeader
              title={event?.title || "Event Details"}
              action={
                <IconButton onClick={() => onClose({}, "backdropClick")}>
                  <CloseIcon />
                </IconButton>
              }
            />
            <CardContent>
              {/* Event details */}
              <InfoRow
                icon={<CircleIcon style={{ color: getEventColor() }} />}
                text={event?.title || "No title"}
              />
              <InfoRow
                icon={<CircleIcon style={{ color: getEventColor() }} />}
                text={`${formatLocalDateTime(new Date(event?.start || Date.now()))} - ${formatLocalDateTime(new Date(event?.end || Date.now()))}`}
              />
              <InfoRow
                icon={<CircleIcon style={{ color: getEventColor() }} />}
                text={event?.location || "No location"}
              />
              <InfoRow
                icon={<CircleIcon style={{ color: getEventColor() }} />}
                text={event?.description || "No description"}
              />

              {/* Attendees */}
              {event?.attendee && event.attendee.length > 0 && (
                <Box style={{ margin: "16px 0" }}>
                  <Typography variant="h6" gutterBottom>
                    Attendees
                  </Typography>
                  {event.attendee
                    .slice(0, showAllAttendees ? event.attendee.length : 3)
                    .map((attendee, index) => (
                      <Box
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Avatar {...stringAvatar(attendee.cn || "U")} />
                        <Typography variant="body2">
                          {attendee.cn || attendee.cal_address}
                        </Typography>
                        <Badge
                          color={
                            attendee.partstat === "ACCEPTED"
                              ? "success"
                              : attendee.partstat === "DECLINED"
                                ? "error"
                                : "warning"
                          }
                          variant="dot"
                        >
                          <Typography variant="caption">
                            {attendee.partstat}
                          </Typography>
                        </Badge>
                      </Box>
                    ))}
                  {event.attendee.length > 3 && (
                    <Button
                      size="small"
                      onClick={() => setShowAllAttendees(!showAllAttendees)}
                    >
                      {showAllAttendees ? "Show Less" : "Show More"}
                    </Button>
                  )}
                </Box>
              )}

              {/* RSVP */}
              {currentUserAttendee && isOwnCal && (
                <Card style={{ margin: "8px 0" }}>
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
                    <Button
                      color="primary"
                      onClick={() => console.log("proposenewtime")}
                    >
                      Propose new time
                    </Button>
                  </ButtonGroup>
                </Card>
              )}

              {/* Calendar selector */}
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel id="calendar-select-label">Calendar</InputLabel>
                <Select
                  disabled={!isOwn}
                  labelId="calendar-select-label"
                  value={calendarid.toString()}
                  onChange={(e: SelectChangeEvent) =>
                    setCalendarid(Number(e.target.value))
                  }
                >
                  {calList.map((calendar, index) => (
                    <MenuItem key={index} value={index}>
                      {calendar.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Video conference */}
              {event?.x_openpass_videoconference && (
                <Box style={{ margin: "16px 0" }}>
                  <Typography variant="h6" gutterBottom>
                    Video Conference
                  </Typography>
                  <Button
                    startIcon={<VideocamIcon />}
                    onClick={() =>
                      window.open(event.x_openpass_videoconference, "_blank")
                    }
                    variant="contained"
                    color="primary"
                  >
                    Join Video Conference
                  </Button>
                </Box>
              )}

              {/* Extended options */}
              {showMore && (
                <>
                  <Divider style={{ margin: "16px 0" }} />
                  <Typography variant="h6" gutterBottom>
                    Extended Options
                  </Typography>

                  {/* Notification */}
                  <FormControl fullWidth margin="dense" size="small">
                    <InputLabel id="notification">Notification</InputLabel>
                    <Select
                      disabled={!isOwn}
                      labelId="notification"
                      value={alarm}
                      onChange={(e: SelectChangeEvent) =>
                        setAlarm(e.target.value)
                      }
                    >
                      <MenuItem value={""}>No Notification</MenuItem>
                      <MenuItem value={"-PT1M"}>1 minute</MenuItem>
                      <MenuItem value={"-PT5M"}>2 minutes</MenuItem>
                      <MenuItem value={"-PT10M"}>10 minutes</MenuItem>
                      <MenuItem value={"-PT15M"}>15 minutes</MenuItem>
                      <MenuItem value={"-PT30M"}>30 minutes</MenuItem>
                      <MenuItem value={"-PT1H"}>1 hours</MenuItem>
                      <MenuItem value={"-PT2H"}>2 hours</MenuItem>
                      <MenuItem value={"-PT5H"}>5 hours</MenuItem>
                      <MenuItem value={"-PT12H"}>12 hours</MenuItem>
                      <MenuItem value={"-PT1D"}>1 day</MenuItem>
                      <MenuItem value={"-PT2D"}>2 days</MenuItem>
                      <MenuItem value={"-PT1W"}>1 week</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Show me as */}
                  <FormControl fullWidth margin="dense" size="small">
                    <InputLabel id="busy">Show me as</InputLabel>
                    <Select
                      disabled={!isOwn}
                      labelId="busy"
                      value={busy}
                      onChange={(e: SelectChangeEvent) =>
                        setBusy(e.target.value)
                      }
                    >
                      <MenuItem value={"TRANSPARENT"}>Free</MenuItem>
                      <MenuItem value={"OPAQUE"}>Busy </MenuItem>
                    </Select>
                  </FormControl>

                  {/* Repeat */}
                  {showRepeat && (
                    <Box style={{ margin: "16px 0" }}>
                      <Typography variant="h6" gutterBottom>
                        Repeat
                      </Typography>
                      <RepeatEvent
                        repetition={repetition}
                        eventStart={new Date(event?.start || Date.now())}
                        setRepetition={setRepetition}
                      />
                    </Box>
                  )}

                  {/* Attendees */}
                  <Box style={{ margin: "16px 0" }}>
                    <Typography variant="h6" gutterBottom>
                      Participants
                    </Typography>
                    <AttendeeSelector
                      attendees={attendees}
                      setAttendees={setAttendees}
                    />
                  </Box>
                </>
              )}
            </CardContent>

            <CardActions>
              <ButtonGroup>
                {isOwn && (
                  <IconButton
                    size="small"
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
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
                <Button size="small" onClick={handleToggleShowMore}>
                  {showMore ? "Show Less" : "Show More"}
                </Button>

                {isOwn && (
                  <Button size="small" onClick={handleSave}>
                    Save
                  </Button>
                )}
              </ButtonGroup>
            </CardActions>
          </Card>
        </Box>
      </Modal>
    </>
  );
}

export function InfoRow({
  icon,
  text,
  error = false,
  data,
}: {
  icon: React.ReactNode;
  text: string;
  error?: boolean;
  data?: string;
}) {
  return (
    <Box
      style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
    >
      {icon}
      <Typography variant="body2" color={error ? "error" : "textPrimary"}>
        {text}
      </Typography>
      {data && (
        <Typography variant="caption" color="textSecondary">
          {data}
        </Typography>
      )}
    </Box>
  );
}

export function AttendeeRow({
  attendee,
  key,
}: {
  attendee: userAttendee;
  key: number;
}) {
  return (
    <Box
      key={key}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
      }}
    >
      <Avatar {...stringAvatar(attendee.cn || "U")} />
      <Typography variant="body2">
        {attendee.cn || attendee.cal_address}
      </Typography>
      <Badge
        color={
          attendee.partstat === "ACCEPTED"
            ? "success"
            : attendee.partstat === "DECLINED"
              ? "error"
              : "warning"
        }
        variant="dot"
      >
        <Typography variant="caption">{attendee.partstat}</Typography>
      </Badge>
    </Box>
  );
}

export function stringToColor(string: string) {
  let hash = 0;
  let i;

  /* eslint-disable no-bitwise */
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.substr(-2);
  }
  /* eslint-enable no-bitwise */

  return color;
}

export function stringAvatar(name: string) {
  return {
    sx: { width: 24, height: 24, fontSize: 18, bgcolor: stringToColor(name) },
    children: name[0],
  };
}

export function renderAttendeeBadge(
  attendee: userAttendee,
  key: string,
  isOrganizer = false
) {
  return (
    <Box
      key={key}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
      }}
    >
      <Avatar {...stringAvatar(attendee.cn || "U")} />
      <Typography variant="body2">
        {attendee.cn || attendee.cal_address}
        {isOrganizer && " (Organizer)"}
      </Typography>
    </Box>
  );
}
