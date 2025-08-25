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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import VideocamIcon from "@mui/icons-material/Videocam";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CircleIcon from "@mui/icons-material/Circle";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { userAttendee } from "../User/userDataTypes";
import timezone from "ical.js/dist/types/timezone";
import { title } from "process";
import { start } from "repl";
import { TIMEZONES } from "../../utils/timezone-data";
import { Calendars } from "../Calendars/CalendarTypes";
import { putEvent } from "./EventApi";

function EventDisplayModal({
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
  const calendars = useAppSelector((state) =>
    Object.keys(state.calendars.list).map((id) => state.calendars.list[id])
  );
  const userPersonnalCalendars: Calendars[] = useAppSelector((state) =>
    Object.keys(state.calendars.list).map((id) => {
      if (id.split("/")[0] === user.userData.openpaasId) {
        return state.calendars.list[id];
      }
      return {} as Calendars;
    })
  ).filter((calendar) => calendar.id);
  const timezones = TIMEZONES.aliases;
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [location, setLocation] = useState(event.location);
  const [start, setStart] = useState(new Date(event.start));
  const [end, setEnd] = useState(new Date(event.end ?? ""));
  const [calendarid, setCalendarid] = useState(
    event.calId.split("/")[0] === user.userData.openpaasId
      ? userPersonnalCalendars.findIndex((cal) => cal.id === calId)
      : calendars.findIndex((cal) => cal.id === calId)
  );
  const [allday, setAllDay] = useState(event.allday);
  const [repetition, setRepetition] = useState(event.repetition ?? "");
  const [alarm, setAlarm] = useState("");
  const [eventClass, setEventClass] = useState(event.class);
  const [selectedRange, setSelectedRange] = useState({
    start: new Date(event.start),
    end: new Date(event.end ?? ""),
    allday: event.allday,
  });
  const [timezone, setTimezone] = useState(event.timezone);
  const [showMore, setShowMore] = useState(false);
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

  const isOwn = organizer?.cal_address === user.userData.email;

  const calList =
    event.calId.split("/")[0] === user.userData.openpaasId
      ? Object.keys(userPersonnalCalendars).map((calendar, index) => (
          <MenuItem key={index} value={index}>
            <Typography variant="body2">
              <CircleIcon
                sx={{
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
                sx={{
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
      <Card
        sx={{
          minWidth: 300,
          width: "50vw",
          p: 2,
          position: "absolute",
        }}
      >
        {/* Top-right buttons */}
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 1,
            overflowY: "auto",
          }}
        >
          <IconButton size="small" onClick={() => onClose({}, "backdropClick")}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <CardHeader title={isOwn ? "Edit Event" : "Event Details"} />
        <CardContent sx={{ maxHeight: "85vh", overflow: "auto", pt: 1.5 }}>
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
          {currentUserAttendee && (
            <Card>
              <Box>
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
              </Box>
            </Card>
          )}
          <FormControl fullWidth margin="dense" size="small">
            <InputLabel id="calendar-select-label">Calendar</InputLabel>
            <Select
              disabled={!isOwn}
              labelId="calendar-select-label"
              value={calendarid.toString()}
              label="Calendar"
              onChange={(e: SelectChangeEvent) =>
                setCalendarid(Number(e.target.value))
              }
            >
              {calList}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Start"
            disabled={!isOwn}
            type={allday ? "date" : "datetime-local"}
            value={
              allday
                ? start.toISOString().split("T")[0]
                : start.toISOString().replace("Z", "")
            }
            onChange={(e) => {
              const newStart = e.target.value;
              // setStart(newStart);
              // const newRange = {
              //   ...selectedRange,
              //   start: new Date(newStart),
              //   startStr: newStart,
              //   allDay: allday,
              // };
              // setSelectedRange(newRange);
              // calendarRef.current?.select(newRange);
            }}
            size="small"
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            disabled={!isOwn}
            label="End"
            type={allday ? "date" : "datetime-local"}
            value={
              allday
                ? end?.toISOString().split("T")[0]
                : end?.toISOString().replace("Z", "")
            }
            onChange={(e) => {
              const newEnd = e.target.value;
              // setEnd(newEnd);
              // const newRange = {
              //   ...selectedRange,
              //   end: new Date(newEnd),
              //   endStr: newEnd,
              //   allDay: allday,
              // };
              // setSelectedRange(newRange);
              // calendarRef.current?.select(newRange);
            }}
            size="small"
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />{" "}
          <FormControlLabel
            control={
              <Checkbox
                disabled={!isOwn}
                checked={Boolean(allday)}
                onChange={() => {
                  setAllDay(!allday);
                  // const newRange = {
                  //   startStr: allday ? start.split("T")[0] : start,
                  //   endStr: allday ? end.split("T")[0] : end,
                  //   start: new Date(allday ? start.split("T")[0] : start),
                  //   end: new Date(allday ? end.split("T")[0] : end),
                  //   allday,
                  //   ...selectedRange,
                  // };
                  // setSelectedRange(newRange);
                  // calendarRef.current?.select(newRange);
                }}
              />
            }
            label="All day"
          />
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
                  sx={{
                    cursor: "pointer",
                    mt: 0.5,
                    overflowY: "auto",
                  }}
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
          <Divider sx={{ mb: 1 }} />
          {/* Description */}
          {event.description && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {event.description}
            </Typography>
          )}
          {showMore && (
            <>
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel id="busy">Repetition</InputLabel>
                <Select
                  labelId="busy"
                  value={repetition}
                  disabled={!isOwn}
                  label="Repetition"
                  onChange={(e: SelectChangeEvent) =>
                    setRepetition(e.target.value)
                  }
                >
                  <MenuItem value={""}>No Repetition</MenuItem>
                  <MenuItem value={"daily"}>Repeat daily</MenuItem>
                  <MenuItem value={"weekly"}>Repeat weekly</MenuItem>
                  <MenuItem value={"monthly"}>Repeat monthly</MenuItem>
                  <MenuItem value={"yearly"}>Repeat yearly</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel id="repeat">Alarm</InputLabel>
                <Select
                  labelId="repeat"
                  value={alarm}
                  disabled={!isOwn}
                  label="Alarm"
                  onChange={(e: SelectChangeEvent) => setAlarm(e.target.value)}
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
                <InputLabel id="repeat">Repetition</InputLabel>
                <Select
                  labelId="repeat"
                  value={eventClass}
                  disabled={!isOwn}
                  label="Repetition"
                  onChange={(e: SelectChangeEvent) =>
                    setEventClass(e.target.value)
                  }
                >
                  <MenuItem value={"PUBLIC"}>Public</MenuItem>
                  <MenuItem value={"CONFIDENTIAL"}>
                    Show time and date only
                  </MenuItem>
                  <MenuItem value={"PRIVATE"}>Private</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel id="class">class</InputLabel>
                <Select
                  labelId="class"
                  value={eventClass}
                  disabled={!isOwn}
                  label="class"
                  onChange={(e: SelectChangeEvent) =>
                    setEventClass(e.target.value)
                  }
                >
                  <MenuItem value={"PUBLIC"}>Public</MenuItem>
                  <MenuItem value={"CONFIDENTIAL"}>
                    Show time and date only
                  </MenuItem>
                  <MenuItem value={"PRIVATE"}>Private</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel id="repeat">is Busy</InputLabel>
                <Select
                  labelId="busy"
                  value={eventClass}
                  disabled={!isOwn}
                  label="busy"
                  onChange={(e: SelectChangeEvent) =>
                    setEventClass(e.target.value)
                  }
                >
                  <MenuItem value={"free"}>Free</MenuItem>
                  <MenuItem value={"busy"}>Busy </MenuItem>
                </Select>
              </FormControl>
              {/* Error */}
              {event.error && (
                <InfoRow
                  icon={
                    <ErrorOutlineIcon color="error" sx={{ fontSize: 18 }} />
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
            <Button size="small" onClick={() => setShowMore(!showMore)}>
              {!showMore && "Show More"}
              {showMore && "Show Less"}
            </Button>
          </ButtonGroup>
        </CardActions>
      </Card>
    </Modal>
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
  const classIcon =
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
          classIcon && (
            <Box
              sx={{
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

export default EventDisplayModal;
