import { InfoRow } from "@/components/Event/InfoRow";
import { renderAttendeeBadge } from "@/components/Event/utils/eventUtils";
import { AvatarGroup, Box, Button, Typography } from "@linagora/twake-mui";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import RepeatIcon from "@mui/icons-material/Repeat";
import SubjectIcon from "@mui/icons-material/Subject";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import { alpha, useTheme } from "@mui/material/styles";
import { useState } from "react";
import { useI18n } from "twake-i18n";
import { makeAttendeePreview } from ".";
import { CalendarEvent } from "../EventsTypes";
import { EventPreviewAttendees } from "./EventPreviewAttendees";
import { makeRecurrenceString } from "./utils/makeRecurrenceString";

interface EventPreviewDetailsProps {
  event: CalendarEvent;
  isOwn: boolean;
  isNotPrivate: boolean;
  userEmail: string;
}

const ATTENDEE_DISPLAY_LIMIT = 3;

export function EventPreviewDetails({
  event,
  isOwn,
  isNotPrivate,
  userEmail,
}: EventPreviewDetailsProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const infoIconColor = alpha(theme.palette.grey[900], 0.9);
  const infoIconSx = { minWidth: "25px", marginRight: 2, color: infoIconColor };

  const [showAllAttendees, setShowAllAttendees] = useState(false);

  const attendees =
    event.attendee?.filter(
      (a) => a.cal_address !== event.organizer?.cal_address
    ) || [];

  const organizer = event.attendee?.find(
    (a) => a.cal_address === event.organizer?.cal_address
  );

  const attendeePreview = makeAttendeePreview(event.attendee, t);
  const showDetails = (isNotPrivate && !isOwn) || isOwn;

  if (!showDetails) {
    return (
      <Box
        sx={{
          backgroundColor: "#F3F4F6",
          height: 48,
          borderRadius: "8px",
          gap: "14px",
          paddingTop: "14px",
          paddingBottom: "14px",
        }}
      >
        <Typography variant="caption" textAlign="center">
          {t("eventPreview.privateEvent.hiddenDetails")}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {/* Video */}
      {event.x_openpass_videoconference && (
        <InfoRow
          alignItems="flex-start"
          icon={
            <Box sx={{ ...infoIconSx, mt: 1 }}>
              <VideocamOutlinedIcon />
            </Box>
          }
          content={
            <Button
              variant="contained"
              size="medium"
              onClick={() => window.open(event.x_openpass_videoconference)}
              sx={{ borderRadius: "4px" }}
            >
              {t("eventPreview.joinVideo")}
            </Button>
          }
        />
      )}

      {/* Attendees */}
      {attendees.length > 0 && (
        <EventPreviewAttendees
          attendees={attendees}
          organizer={organizer}
          allAttendees={event.attendee}
        />
      )}

      {/* Location */}
      {event.location && (
        <InfoRow
          alignItems="flex-start"
          icon={
            <Box sx={infoIconSx}>
              <LocationOnOutlinedIcon />
            </Box>
          }
          text={event.location}
        />
      )}

      {/* Description */}
      {event.description && (
        <InfoRow
          alignItems="flex-start"
          icon={
            <Box sx={infoIconSx}>
              <SubjectIcon />
            </Box>
          }
          text={event.description}
        />
      )}

      {/* Alarm */}
      {event.alarm && (
        <InfoRow
          alignItems="flex-start"
          icon={
            <Box sx={infoIconSx}>
              <NotificationsNoneIcon />
            </Box>
          }
          text={t("eventPreview.alarmText", {
            trigger: t(`event.form.notifications.${event.alarm.trigger}`),
            action: (() => {
              if (!event.alarm.action) return "";
              const translationKey = `event.form.notifications.${event.alarm.action}`;
              const translated = t(translationKey);
              return translated === translationKey
                ? event.alarm.action
                : translated;
            })(),
          })}
        />
      )}

      {/* Repetition */}
      {event.repetition && (
        <InfoRow
          alignItems="flex-start"
          icon={
            <Box sx={infoIconSx}>
              <RepeatIcon />
            </Box>
          }
          text={makeRecurrenceString(event, t)}
        />
      )}

      {/* Error */}
      {event.error && (
        <InfoRow
          alignItems="flex-start"
          icon={
            <Box sx={infoIconSx}>
              <ErrorOutlineIcon color="error" />
            </Box>
          }
          text={event.error}
          error
        />
      )}
    </>
  );
}
