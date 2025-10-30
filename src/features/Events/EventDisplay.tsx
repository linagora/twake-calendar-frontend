import CircleIcon from "@mui/icons-material/Circle";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import VideocamIcon from "@mui/icons-material/Videocam";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Modal,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AttendeeSelector from "../../components/Attendees/AttendeeSearch";
import {
  handleDelete,
  handleRSVP,
} from "../../components/Event/eventHandlers/eventHandlers";
import RepeatEvent from "../../components/Event/EventRepeat";
import { InfoRow } from "../../components/Event/InfoRow";
import { refreshCalendars } from "../../components/Event/utils/eventUtils";
import { renderAttendeeBadge } from "../../components/Event/utils/eventUtils";
import { getCalendarRange } from "../../utils/dateUtils";
import {
  moveEventAsync,
  putEventAsync,
  removeEvent,
  updateEventInstanceAsync,
  updateSeriesAsync,
} from "../Calendars/CalendarSlice";
import { Calendars } from "../Calendars/CalendarTypes";
import { userAttendee } from "../User/userDataTypes";
import { getEvent } from "./EventApi";
import { formatLocalDateTime } from "../../components/Event/utils/dateTimeFormatters";
import { CalendarEvent, RepetitionObject } from "./EventsTypes";

export default function EventDisplayModal({
  eventId,
  calId,
  open,
  onClose,
  typeOfAction,
}: {
  eventId: string;
  calId: string;
  open: boolean;
  onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
  typeOfAction?: "solo" | "all";
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

  const userPersonalCalendars: Calendars[] = calendars.filter(
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
  const [allday, setAllDay] = useState(event?.allday ?? false);
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
      ? userPersonalCalendars.findIndex((cal) => cal.id === calId)
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
  const isOwnCal = userPersonalCalendars.find((cal) => cal.id === calId);
  const attendeeDisplayLimit = 3;

  useEffect(() => {
    if (!event || !calendar) {
      onClose({}, "backdropClick");
    }
    setRepetition(event?.repetition ?? ({} as RepetitionObject));
  }, [open, eventId, dispatch, onClose, event, calendar]);
  useEffect(() => {
    const fetchMasterEvent = async () => {
      const masterEvent = await getEvent(event);

      setTitle(masterEvent.title ?? "");
      setDescription(masterEvent.description ?? "");
      setLocation(masterEvent.location ?? "");
      setStart(formatLocalDateTime(new Date(masterEvent?.start ?? Date.now())));
      setEnd(formatLocalDateTime(new Date(masterEvent?.end ?? Date.now())));
      setAllDay(masterEvent.allday ?? false);
      setRepetition(masterEvent?.repetition ?? ({} as RepetitionObject));
      setAlarm(masterEvent?.alarm?.trigger ?? "");
      setBusy(masterEvent?.transp ?? "OPAQUE");
      setEventClass(masterEvent?.class ?? "PUBLIC");
      setTimezone(masterEvent.timezone ?? "UTC");
    };
    if (typeOfAction === "all") {
      fetchMasterEvent();
    }
  }, [typeOfAction, event]);

  if (!event || !calendar) return null;
  const isRecurring = event.uid?.includes("/");

  const handleSave = async () => {
    const newEventUID = crypto.randomUUID();

    const newEvent: CalendarEvent = {
      calId,
      title,
      URL: event.URL ?? `/calendars/${calId}/${newEventUID}.ics`,
      start: start,
      end: end,
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
      color: userPersonalCalendars[calendarid]?.color,
      alarm: { trigger: alarm, action: "EMAIL" },
    };

    const [baseId, recurrenceId] = event.uid.split("/");
    const calendarRange = getCalendarRange(new Date(start));

    if (typeOfAction === "solo") {
      dispatch(
        updateEventInstanceAsync({
          cal: userPersonalCalendars[calendarid],
          event: { ...newEvent, recurrenceId: recurrenceId },
        })
      );
    } else if (typeOfAction === "all") {
      dispatch(
        updateSeriesAsync({
          cal: userPersonalCalendars[calendarid],
          event: { ...newEvent, recurrenceId: recurrenceId },
        })
      );
      await refreshCalendars(dispatch, calendars, calendarRange);
    } else {
      dispatch(
        putEventAsync({ cal: userPersonalCalendars[calendarid], newEvent })
      );
    }

    if (newCalId !== calId) {
      dispatch(
        moveEventAsync({
          cal: userPersonalCalendars[calendarid],
          newEvent,
          newURL: `/calendars/${newCalId}/${baseId}.ics`,
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
      ? Object.keys(userPersonalCalendars).map((calendar, index) => (
          <MenuItem key={index} value={index}>
            <Typography variant="body2">
              <CircleIcon
                style={{
                  color:
                    userPersonalCalendars[index].color?.light ?? "#3788D8",
                  width: 12,
                  height: 12,
                }}
              />
              {userPersonalCalendars[index].name}
            </Typography>
          </MenuItem>
        ))
      : Object.keys(calendars).map((calendar, index) => (
          <MenuItem key={index} value={index}>
            <Typography variant="body2">
              <CircleIcon
                style={{
                  color: calendars[index].color?.light ?? "#3788D8",
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
              value={title ?? ""}
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
                    onClick={() =>
                      handleRSVP(
                        dispatch,
                        calendar,
                        user,
                        event,
                        "ACCEPTED",
                        undefined,
                        isRecurring ? typeOfAction : undefined
                      )
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    color={
                      currentUserAttendee.partstat === "TENTATIVE"
                        ? "warning"
                        : "primary"
                    }
                    onClick={() =>
                      handleRSVP(
                        dispatch,
                        calendar,
                        user,
                        event,
                        "TENTATIVE",
                        undefined,
                        isRecurring ? typeOfAction : undefined
                      )
                    }
                  >
                    Maybe
                  </Button>
                  <Button
                    color={
                      currentUserAttendee.partstat === "DECLINED"
                        ? "error"
                        : "primary"
                    }
                    onClick={() =>
                      handleRSVP(
                        dispatch,
                        calendar,
                        user,
                        event,
                        "DECLINED",
                        undefined,
                        isRecurring ? typeOfAction : undefined
                      )
                    }
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
                value={calendarid.toString() ?? ""}
                label="Calendar"
                onChange={(e: SelectChangeEvent) => {
                  const newId = Number(e.target.value);
                  setCalendarid(newId);
                  setNewCalId(userPersonalCalendars[newId].id);
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
            {event.attendee?.length > 0 && (
              <Box style={{ marginBottom: 8 }}>
                <Typography variant="subtitle2">Attendees:</Typography>
                {organizer.cal_address &&
                  renderAttendeeBadge(organizer, "org", true, true)}
                {(showAllAttendees
                  ? attendees
                  : attendees.slice(0, attendeeDisplayLimit)
                ).map((a, idx) => (
                  <Box key={a.cal_address}>
                    {renderAttendeeBadge(a, idx.toString(), true)}
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
                {isOwn && (
                  <RepeatEvent
                    repetition={repetition}
                    eventStart={new Date(event.start)}
                    setRepetition={setRepetition}
                    isOwn={isOwn && typeOfAction !== "solo"}
                  />
                )}
                <FormControl fullWidth margin="dense" size="small">
                  <InputLabel id="notification">Notification</InputLabel>
                  <Select
                    labelId="notification"
                    label="Notification"
                    value={alarm}
                    disabled={!isOwn}
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
                  onClick={() =>
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
                  }
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
