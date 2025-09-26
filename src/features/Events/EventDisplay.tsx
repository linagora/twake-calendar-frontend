import { useEffect, useState } from "react";
import {
  deleteEventAsync,
  getEventAsync,
  moveEventAsync,
  putEventAsync,
  removeEvent,
} from "../Calendars/CalendarSlice";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AttendeeSelector from "../../components/Attendees/AttendeeSearch";
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
  Modal,
  TextField,
  CardHeader,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Checkbox,
  FormControlLabel,
  CardActions,
  Link,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import VideocamIcon from "@mui/icons-material/Videocam";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CircleIcon from "@mui/icons-material/Circle";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { userAttendee } from "../User/userDataTypes";
import { TIMEZONES } from "../../utils/timezone-data";
import { Calendars } from "../Calendars/CalendarTypes";
import { CalendarEvent, RepetitionObject } from "./EventsTypes";
import { isValidUrl } from "../../utils/apiUtils";
import { formatLocalDateTime } from "./EventModal";
import RepeatEvent from "../../components/Event/EventRepeat";

export default function EventDisplayModal({
  eventId,
  calId,
  open,
  onClose,
}: {
  eventId: string;
  calId: string;
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
  const [showMore, setShowMore] = useState(false);

  const calendars = Object.values(
    useAppSelector((state) => state.calendars.list)
  );

  const userPersonnalCalendars: Calendars[] = calendars.filter(
    (c) => c.id?.split("/")[0] === user.userData?.openpaasId
  );

  // Form state
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [start, setStart] = useState(
    formatLocalDateTime(new Date(event?.start ?? Date.now()))
  );
  const [end, setEnd] = useState(
    formatLocalDateTime(new Date(event?.end ?? Date.now()))
  );
  const [allday, setAllDay] = useState(event?.allday);
  const [repetition, setRepetition] = useState<RepetitionObject>(
    event?.repetition ?? ({} as RepetitionObject)
  );
  const [alarm, setAlarm] = useState(event?.alarm?.trigger ?? "");
  const [busy, setBusy] = useState(event?.transp ?? "OPAQUE");
  const [eventClass, setEventClass] = useState(event?.class ?? "PUBLIC");
  const [timezone, setTimezone] = useState(event?.timezone ?? "UTC");
  const [newCalId, setNewCalId] = useState(event?.calId);
  const [calendarid, setCalendarid] = useState(
    calId.split("/")[0] === user.userData?.openpaasId
      ? userPersonnalCalendars.findIndex((cal) => cal.id === calId)
      : calendars.findIndex((cal) => cal.id === calId)
  );

  const [attendees, setAttendees] = useState(
    (event?.attendee || []).filter(
      (a) => a.cal_address !== event?.organizer?.cal_address
    )
  );
  const currentUserAttendee = event?.attendee?.find(
    (person) => person.cal_address === user.userData.email
  );

  const organizer =
    event?.attendee?.find(
      (a) => a.cal_address === event?.organizer?.cal_address
    ) ?? ({} as userAttendee);

  const isOwn = organizer?.cal_address === user.userData.email;
  const isOwnCal = userPersonnalCalendars.find((cal) => cal.id === calId);
  const attendeeDisplayLimit = 3;

  useEffect(() => {
    if (!event || !calendar) {
      onClose({}, "backdropClick");
    }
    setRepetition(event?.repetition ?? ({} as RepetitionObject));
  }, [open, eventId, dispatch, onClose, event]);

  if (!event || !calendar) return null;

  function handleRSVP(rsvp: string) {
    const newEvent = {
      ...event,
      attendee: event.attendee?.map((a) =>
        a.cal_address === user.userData.email ? { ...a, partstat: rsvp } : a
      ),
    };

    dispatch(putEventAsync({ cal: calendar, newEvent }));
  }

  const handleSave = async () => {
    const newEventUID = crypto.randomUUID();

    const newEvent: CalendarEvent = {
      calId,
      title,
      URL: event.URL ?? `/calendars/${calId}/${newEventUID}.ics`,
      start: new Date(start),
      end: new Date(end),
      allday,
      uid: event.uid ?? newEventUID,
      description,
      location,
      repetition,
      class: eventClass,
      organizer: event.organizer,
      timezone,
      attendee: [organizer, ...attendees],
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

    if (newCalId !== calId) {
      dispatch(
        moveEventAsync({
          cal: userPersonnalCalendars[calendarid],
          newEvent,
          newURL: `/calendars/${newCalId}/${event.uid}.ics`,
        })
      );
      dispatch(removeEvent({ calendarUid: calId, eventUid: event.uid }));
    }
    onClose({}, "backdropClick");
  };

  const handleToggleShowMore = async () => {
    setShowMore(!showMore);
  };

  const calList =
    calId.split("/")[0] === user.userData?.openpaasId
      ? Object.keys(userPersonnalCalendars).map((calendar, index) => (
          <MenuItem key={index} value={index}>
            <Typography variant="body2">
              <CircleIcon
                style={{
                  color: userPersonnalCalendars[index].color ?? "#3788D8",
                  width: 12,
                  height: 12,
                }}
              />
              {userPersonnalCalendars[index].name}
            </Typography>
          </MenuItem>
        ))
      : Object.keys(calendars).map((calendar, index) => (
          <MenuItem key={index} value={index}>
            <Typography variant="body2">
              <CircleIcon
                style={{
                  color: calendars[index].color ?? "#3788D8",
                  width: 12,
                  height: 12,
                }}
              />
              {calendars[index].name} - {calendars[index].owner}
            </Typography>
          </MenuItem>
        ));

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        style={{
          position: "absolute",
          top: "5vh",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "50vw",
          maxHeight: "80vh",
        }}
      >
        <Card style={{ padding: 16, position: "absolute" }}>
          {/* Close button */}
          <Box style={{ position: "absolute", top: 8, right: 8 }}>
            <IconButton
              size="small"
              onClick={() => onClose({}, "backdropClick")}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <CardHeader title={isOwn ? "Edit Event" : "Event Details"} />

          <CardContent style={{ maxHeight: "75vh", overflow: "auto" }}>
            {/* Title */}
            <TextField
              fullWidth
              disabled={!isOwn}
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              size="small"
              margin="dense"
            />

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
                label="Calendar"
                onChange={(e: SelectChangeEvent) => {
                  const newId = Number(e.target.value);
                  setCalendarid(newId);
                  setNewCalId(userPersonnalCalendars[newId].id);
                }}
              >
                {calList}
              </Select>
            </FormControl>

            {/* Dates */}
            <TextField
              fullWidth
              label="Start"
              disabled={!isOwn}
              type={allday ? "date" : "datetime-local"}
              value={allday ? start.split("T")[0] : start.slice(0, 16)}
              onChange={(e) =>
                setStart(formatLocalDateTime(new Date(e.target.value)))
              }
              size="small"
              margin="dense"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              disabled={!isOwn}
              label="End"
              type={allday ? "date" : "datetime-local"}
              value={allday ? end.split("T")[0] : end.slice(0, 16)}
              onChange={(e) =>
                setEnd(formatLocalDateTime(new Date(e.target.value)))
              }
              size="small"
              margin="dense"
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  disabled={!isOwn}
                  checked={allday}
                  onChange={() => {
                    const endDate = new Date(end);
                    const startDate = new Date(start);
                    setAllDay(!allday);
                    if (endDate.getDate() === startDate.getDate()) {
                      endDate.setDate(startDate.getDate() + 1);
                      setEnd(formatLocalDateTime(endDate));
                    }
                  }}
                />
              }
              label="All day"
            />

            {/* Description & Location */}
            <TextField
              fullWidth
              disabled={!isOwn}
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="small"
              margin="dense"
              multiline
              rows={2}
            />

            {isOwn && (
              <AttendeeSelector
                attendees={attendees}
                setAttendees={setAttendees}
              />
            )}

            <TextField
              fullWidth
              label="Location"
              disabled={!isOwn}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              size="small"
              margin="dense"
            />

            {/* Video */}
            {event.x_openpass_videoconference && (
              <InfoRow
                icon={<VideocamIcon style={{ fontSize: 18 }} />}
                text="Video conference available"
                data={event.x_openpass_videoconference}
              />
            )}

            {/* Attendees */}
            {event.attendee?.length > 0 && (
              <Box style={{ marginBottom: 8 }}>
                <Typography variant="subtitle2">Attendees:</Typography>
                {organizer.cal_address &&
                  renderAttendeeBadge(organizer, "org", true)}
                {(showAllAttendees
                  ? attendees
                  : attendees.slice(0, attendeeDisplayLimit)
                ).map((a, idx) => (
                  <Box key={a.cal_address}>
                    {renderAttendeeBadge(a, idx.toString())}
                    {isOwn && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          const newAttendeesList = [...attendees];
                          newAttendeesList.splice(idx, 1);
                          setAttendees(newAttendeesList);
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
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

            <Divider style={{ margin: "8px 0" }} />

            {/* Extended options */}
            {showMore && (
              <>
                <RepeatEvent
                  repetition={repetition}
                  eventStart={event.start}
                  setRepetition={setRepetition}
                  isOwn={isOwn}
                />
                <FormControl fullWidth margin="dense" size="small">
                  <InputLabel id="alarm">Alarm</InputLabel>
                  <Select
                    labelId="alarm"
                    label="Alarm"
                    value={alarm}
                    disabled={!isOwn}
                    onChange={(e: SelectChangeEvent) =>
                      setAlarm(e.target.value)
                    }
                  >
                    <MenuItem value={""}>No Alarm</MenuItem>
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
                <FormControl fullWidth margin="dense" size="small">
                  <InputLabel id="Visibility">Visibility</InputLabel>
                  <Select
                    labelId="Visibility"
                    label="Visibility"
                    value={eventClass}
                    disabled={!isOwn}
                    onChange={(e: SelectChangeEvent) =>
                      setEventClass(e.target.value)
                    }
                  >
                    <MenuItem value={"PUBLIC"}>Public</MenuItem>
                    <MenuItem value={"CONFIDENTIAL"}>Show time only</MenuItem>
                    <MenuItem value={"PRIVATE"}>Private</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense" size="small">
                  <InputLabel id="busy">is Busy</InputLabel>
                  <Select
                    labelId="busy"
                    value={busy}
                    disabled={!isOwn}
                    label="is busy"
                    onChange={(e: SelectChangeEvent) => setBusy(e.target.value)}
                  >
                    <MenuItem value={"TRANSPARENT"}>Free</MenuItem>
                    <MenuItem value={"OPAQUE"}>Busy </MenuItem>
                  </Select>
                </FormControl>
                {/* Error */}
                {event.error && (
                  <InfoRow
                    icon={
                      <ErrorOutlineIcon
                        color="error"
                        style={{ fontSize: 18 }}
                      />
                    }
                    text={event.error}
                    error
                  />
                )}
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
                      deleteEventAsync({ calId, eventId, eventURL: event.URL })
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
        {isValidUrl(data) ? <Link href={data}>{text}</Link> : text}
      </Typography>
    </Box>
  );
}

export function renderAttendeeBadge(
  a: userAttendee,
  key: string,
  isOrganizer?: boolean
) {
  const classIcon =
    a.partstat === "ACCEPTED" ? (
      <CheckCircleIcon fontSize="inherit" color="success" />
    ) : a.partstat === "DECLINED" ? (
      <CancelIcon fontSize="inherit" color="error" />
    ) : null;

  return (
    <Box
      key={key}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 4,
        padding: 4,
        borderRadius: 4,
      }}
    >
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        badgeContent={
          classIcon && (
            <Box
              style={{
                fontSize: 14,
                lineHeight: 0,
                backgroundColor: "white",
                borderRadius: "50%",
                padding: "1px",
              }}
            >
              {classIcon}
            </Box>
          )
        }
      >
        <Avatar {...stringAvatar(a.cn || a.cal_address)} />
      </Badge>
      <Box style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Typography
          variant="body2"
          noWrap
          style={{
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
            style={{ fontStyle: "italic" }}
          >
            Organizer
          </Typography>
        )}
      </Box>
    </Box>
  );
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

export function stringAvatar(name: string) {
  return {
    sx: { width: 24, height: 24, fontSize: 18, bgcolor: stringToColor(name) },
    children: name[0],
  };
}
