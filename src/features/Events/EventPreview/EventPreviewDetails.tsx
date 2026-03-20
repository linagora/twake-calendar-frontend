import { InfoRow } from "@/components/Event/InfoRow";
import { Box, Button, Link, Typography } from "@linagora/twake-mui";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import RepeatIcon from "@mui/icons-material/Repeat";
import SubjectIcon from "@mui/icons-material/Subject";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import { alpha, useTheme } from "@mui/material/styles";
import { useMemo } from "react";
import { useI18n } from "twake-i18n";
import { CalendarEvent } from "../EventsTypes";
import { EventPreviewAttendees } from "./EventPreviewAttendees";
import { makeRecurrenceString } from "./utils/makeRecurrenceString";

interface EventPreviewDetailsProps {
  event: CalendarEvent;
  isOwn: boolean;
  isNotPrivate: boolean;
}

export function EventPreviewDetails({
  event,
  isOwn,
  isNotPrivate,
}: EventPreviewDetailsProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const infoIconColor = alpha(theme.palette.grey[900], 0.9);
  const infoIconSx = { minWidth: "25px", marginRight: 2, color: infoIconColor };

  const resources = useMemo(
    () => event?.attendee?.filter((attendee) => attendee.cutype === "RESOURCE"),
    [event?.attendee]
  );
  const eventAttendees = useMemo(
    () =>
      event?.attendee?.filter((attendee) => attendee.cutype !== "RESOURCE") ??
      [],
    [event?.attendee]
  );

  const attendees =
    eventAttendees?.filter(
      (a) => a.cal_address !== event.organizer?.cal_address
    ) || [];
  const organizer = eventAttendees?.find(
    (a) => a.cal_address === event.organizer?.cal_address
  );

  const showDetails = isNotPrivate || isOwn;

  if (!showDetails) {
    return (
      <Box
        sx={{
          backgroundColor: "#F3F4F6",
          height: 48,
          borderRadius: "8px",
          gap: "16px",
          paddingTop: "16px",
          paddingBottom: "16px",
        }}
      >
        <Typography
          fontWeight={500}
          fontSize={"12px"}
          lineHeight={"16px"}
          letterSpacing={"0.5px"}
          textAlign={"center"}
        >
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
            <Link
              href={event.x_openpass_videoconference}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textDecoration: "none" }}
            >
              <Button
                variant="contained"
                size="medium"
                sx={{ borderRadius: "4px" }}
              >
                {t("eventPreview.joinVideo")}
              </Button>
            </Link>
          }
        />
      )}

      {/* Attendees */}
      {attendees.length > 0 && (
        <EventPreviewAttendees
          attendees={attendees}
          organizer={organizer}
          allAttendees={eventAttendees ?? []}
          start={event.start}
          end={event.end}
          timezone={event.timezone}
          eventUid={event.uid}
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

      {/* Resource */}
      {resources?.length > 0 && (
        <InfoRow
          alignItems="flex-start"
          flexWrap="wrap"
          icon={
            <Box sx={infoIconSx}>
              <LayersOutlinedIcon />
            </Box>
          }
          content={resources.map((resource, index) => (
            <Box
              sx={{
                marginRight: "5px",
              }}
            >
              <Typography
                variant="body2"
                color="textPrimary"
                sx={{
                  wordBreak: "break-word",
                  whiteSpace: "pre-line",
                  maxHeight: "33vh",
                  overflowY: "auto",
                  width: "100%",
                }}
              >
                {resource.cn}
                {index < resources.length - 1 ? "," : ""}
              </Typography>
              <Typography
                sx={{
                  wordBreak: "break-word",
                  whiteSpace: "pre-line",
                  overflowY: "auto",
                  width: "100%",
                  fontSize: "13px",
                  color: "#717D96",
                }}
              >
                {t(`eventPreview.${resource.partstat}`)}
              </Typography>
            </Box>
          ))}
          style={{
            fontSize: "16px",
            fontFamily: "'Inter', sans-serif",
          }}
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
