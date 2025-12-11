import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RepeatIcon from "@mui/icons-material/Repeat";
import SquareRoundedIcon from "@mui/icons-material/SquareRounded";
import VideocamIcon from "@mui/icons-material/Videocam";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { useI18n } from "twake-i18n";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { AppDispatch } from "../../app/store";
import logo from "../../static/noResult-logo.svg";
import { browserDefaultTimeZone } from "../../utils/timezone";
import { getEventAsync } from "../Calendars/CalendarSlice";
import EventPreviewModal from "../Events/EventDisplayPreview";
import { CalendarEvent } from "../Events/EventsTypes";

import { setView } from "../Settings/SettingsSlice";
import "./searchResult.styl";

const styles = {
  M3BodyLarge: {
    fontFamily: "Roboto",
    fontWeight: 400,
    fontStyle: "normal",
    fontSize: "22px",
    lineHeight: "28px",
    letterSpacing: "0%",
    color: "#243B55",
  },
  M3BodyMedium1: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontStyle: "normal",
    fontSize: "16px",
    lineHeight: "24px",
    letterSpacing: "-0.15px",
    color: "#243B55",
  },
  M3BodyMedium: {
    fontFamily: "Roboto",
    fontWeight: 400,
    fontStyle: "normal",
    fontSize: "14px",
    lineHeight: "20px",
    letterSpacing: "0.25px",
    verticalAlign: "middle",
    color: "#8C9CAF",
  },
  M3BodyMedium3: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "20px",
    letterSpacing: "0.25px",
    verticalAlign: "middle",
    color: "#8C9CAF",
  },
  M3TitleMedium: {
    fontFamily: "Roboto",
    fontWeight: 500,
    fontStyle: "medium",
    fontSize: "16px",
    lineHeight: "24px",
    letterSpacing: "0.15px",
    textAlign: "center",
    verticalAlign: "middle",
    color: "#243B55",
  },
};

export default function SearchResultsPage() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const { error, loading, hits, results } = useAppSelector(
    (state) => state.searchResult
  );

  let layout;

  if (loading) {
    layout = (
      <Box className="loading">
        <CircularProgress size={32} />
      </Box>
    );
  } else if (error) {
    layout = (
      <Box className="error">
        <Typography className="error-text">{error}</Typography>
      </Box>
    );
  } else if (!hits) {
    layout = (
      <Box className="noResults">
        <img className="logo" src={logo} alt={t("search.noResults")} />
        <Typography sx={styles.M3TitleMedium}>
          {t("search.noResults")}
        </Typography>
        <Typography sx={styles.M3BodyMedium}>
          {t("search.noResultsSubtitle")}
        </Typography>
      </Box>
    );
  } else {
    layout = (
      <Box className="search-result-content-body">
        <Stack sx={{ mt: 2 }}>
          {results?.map((r: any, idx: number) => (
            <ResultItem
              key={`row-${idx}-event-${r.data.uid}`}
              eventData={r}
              dispatch={dispatch}
            />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box className={`search-layout`}>
      <Box className="search-result-content-header">
        <Box className="back-button">
          <IconButton
            onClick={() => dispatch(setView("calendar"))}
            aria-label={t("settings.back")}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">{t("search.resultsTitle")}</Typography>
        </Box>
      </Box>
      {layout}
    </Box>
  );
}

function ResultItem({
  eventData,
  dispatch,
}: {
  eventData: Record<string, any>;
  dispatch: AppDispatch;
}) {
  const { t } = useI18n();
  const startDate = new Date(eventData.data.start);
  const endDate = eventData.data.end ? new Date(eventData.data.end) : startDate;
  const timeZone =
    useAppSelector((state) => state.settings.timeZone) ??
    browserDefaultTimeZone;
  const calendar = useAppSelector(
    (state) =>
      state.calendars.list[
        `${eventData.data.userId}/${eventData.data.calendarId}`
      ]
  );
  const calendarColor = calendar?.color?.light;

  const [openPreview, setOpenPreview] = useState(false);

  const handleOpenResult = async (eventData: Record<string, any>) => {
    if (calendar) {
      const event = {
        URL: eventData._links.self.href,
        calId: calendar.id,
        uid: eventData.data.uid,
        start: eventData.data.start,
        end: eventData.data.end,
        allday: eventData.data.allDay,
        attendee: eventData.data.attendees,
        class: eventData.data.class,
        description: eventData.data.description,
        stamp: eventData.data.dtstamp,
        location: eventData.data.location,
        organizer: eventData.data.organizer,
        title: eventData.data.summary,
        timezone: timeZone,
      } as CalendarEvent;
      await dispatch(getEventAsync(event));
      setOpenPreview(true);
    }
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 2,
          p: 3,
          borderTop: "1px solid #F3F6F9",
          cursor: "pointer",
          "&:hover": { backgroundColor: "#e7e7e7ff" },
          alignItems: "center",
          textAlign: "left",
          maxWidth: "80vw",
        }}
        onClick={() => handleOpenResult(eventData)}
      >
        <Typography sx={{ ...styles.M3BodyLarge, minWidth: "90px" }}>
          {startDate.toLocaleDateString(t("locale"), {
            day: "2-digit",
            month: "short",
            timeZone,
          })}
          {startDate.toDateString() !== endDate.toDateString() && (
            <>
              {" - "}
              {endDate.toLocaleDateString(t("locale"), {
                day: "2-digit",
                month: "short",
                timeZone,
              })}
            </>
          )}
        </Typography>
        {!eventData.data.allDay && (
          <Typography sx={{ ...styles.M3BodyMedium1, minWidth: "120px" }}>
            {startDate.toLocaleTimeString(t("locale"), {
              hour: "2-digit",
              minute: "2-digit",
              timeZone,
            })}
            -
            {endDate.toLocaleTimeString(t("locale"), {
              hour: "2-digit",
              minute: "2-digit",
              timeZone,
            })}
          </Typography>
        )}

        <SquareRoundedIcon
          style={{
            color: calendarColor ?? "#3788D8",
            width: 24,
            height: 24,
            flexShrink: 0,
          }}
        />
        <Box display="flex" flexDirection="row" gap={1} sx={{ minWidth: 0 }}>
          <Typography sx={styles.M3BodyLarge}>
            {eventData.data.summary || t("event.untitled")}
          </Typography>
          {eventData.data.isRecurrentMaster && <RepeatIcon />}
        </Box>
        {(eventData.data.organizer?.cn || eventData.data.organizer?.email) && (
          <Typography
            sx={{
              ...styles.M3BodyMedium1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: "150px",
              maxWidth: "150px",
            }}
          >
            {eventData.data.organizer.cn || eventData.data.organizer.email}
          </Typography>
        )}
        {eventData.data?.location && (
          <Typography
            sx={{
              ...styles.M3BodyMedium,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: "150px",
              maxWidth: "250px",
            }}
          >
            {eventData.data.location}
          </Typography>
        )}
        {eventData.data?.description && (
          <Typography
            sx={{
              ...styles.M3BodyMedium3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
              minWidth: 0,
            }}
          >
            {eventData.data.description.replace(/\n/g, " ")}
          </Typography>
        )}
        {eventData.data["x-openpaas-videoconference"] && (
          <Button
            startIcon={<VideocamIcon />}
            sx={{ flexShrink: 0, ml: "auto" }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                eventData.data["x-openpaas-videoconference"],
                "_blank",
                "noopener,noreferrer"
              );
            }}
          >
            {t("eventPreview.joinVideoShort")}
          </Button>
        )}
      </Box>
      {calendar && calendar.events[eventData.data.uid] && (
        <EventPreviewModal
          eventId={eventData.data.uid}
          calId={calendar.id}
          open={openPreview}
          onClose={() => setOpenPreview(false)}
        />
      )}
    </>
  );
}
