import React, { useEffect, useState } from "react";
import { addEvent } from "../Calendars/CalendarSlice";
import { CalendarEvent } from "./EventsTypes";
import { DateSelectArg } from "@fullcalendar/core";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  Popover,
  TextField,
  Button,
  Box,
  Typography,
  Select,
  MenuItem,
  SelectChangeEvent,
  Avatar,
  ButtonGroup,
  Card,
  CardContent,
  Divider,
  IconButton,
} from "@mui/material";
import EventModal from "./EventModal";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import VideocamIcon from "@mui/icons-material/Videocam";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CircleIcon from "@mui/icons-material/Circle";

function EventDisplayModal({
  eventId,
  calId,
  anchorEl,
  open,
  onClose,
}: {
  eventId: string;
  calId: string;
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
}) {
  if (calId && eventId) {
    const calendar = useAppSelector((state) => state.calendars.list[calId]);
    const event = useAppSelector(
      (state) => state.calendars.list[calId].events[eventId]
    );
    const user = useAppSelector((state) => state.user);
    const [showAllAttendees, setShowAllAttendees] = useState(false);
    const attendeeDisplayLimit = 3;

    const visibleAttendees = showAllAttendees
      ? event.attendee
      : event.attendee.slice(0, attendeeDisplayLimit);
    console.log(event);
    return (
      <Popover open={open} anchorEl={anchorEl} onClose={onClose}>
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
            <IconButton size="small">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <DeleteIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onClose({}, "backdropClick")}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <CardContent sx={{ pt: 1.5 }}>
            {/* Title */}
            {event.title && (
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {event.title}
              </Typography>
            )}

            {/* Time info */}
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {formatDate(event.start)}
              {event.end &&
                ` – ${new Date(event.end).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
            </Typography>

            {event.location && (
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <LocationOnIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2">{event.location}</Typography>
              </Box>
            )}

            {/* Description */}
            {event.description && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {event.description}
              </Typography>
            )}

            {/* Video conference */}
            {event.x_openpass_videoconference && (
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <VideocamIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2">
                  Video conference available
                </Typography>
              </Box>
            )}

            {/* Attendees */}
            {/* Attendees with toggle */}
            {event.attendee?.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Attendees:</Typography>
                {visibleAttendees.map((a, idx) => (
                  <Typography key={idx} variant="body2">
                    {a.cn}
                  </Typography>
                ))}

                {event.attendee.length > attendeeDisplayLimit && (
                  <Typography
                    variant="body2"
                    color="primary"
                    sx={{ cursor: "pointer", mt: 0.5 }}
                    onClick={() => setShowAllAttendees(!showAllAttendees)}
                  >
                    {showAllAttendees
                      ? "Show less"
                      : `Show more (${
                          event.attendee.length - attendeeDisplayLimit
                        } more)`}
                  </Typography>
                )}
              </Box>
            )}

            {/* Error */}
            {event.error && (
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}
              >
                <ErrorOutlineIcon color="error" sx={{ fontSize: 18 }} />
                <Typography variant="body2" color="error">
                  {event.error}
                </Typography>
              </Box>
            )}

            {/* Colored dot and calendar icon row */}
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

            {/* Attendance options */}
            {event.attendee.find(
              (person) => person.cal_address === `mailto:${user.userData.email}`
            ) && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Will you attend?
                </Typography>
                <ButtonGroup size="small" fullWidth>
                  <Button>Accept</Button>
                  <Button>Maybe</Button>
                  <Button>Decline</Button>
                </ButtonGroup>
              </Box>
            )}
          </CardContent>
        </Card>
      </Popover>
    );
  } else {
    return <></>;
  }
}

const formatDate = (date: Date) =>
  new Date(date).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default EventDisplayModal;
