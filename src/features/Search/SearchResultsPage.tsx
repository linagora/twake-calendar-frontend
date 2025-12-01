import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SquareRoundedIcon from "@mui/icons-material/SquareRounded";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { ThunkDispatch } from "@reduxjs/toolkit";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { AppDispatch } from "../../app/store";
import logo from "../../static/noResult-logo.svg";
import { getEventAsync } from "../Calendars/CalendarSlice";
import EventPreviewModal from "../Events/EventDisplayPreview";
import { CalendarEvent } from "../Events/EventsTypes";

import { setView } from "../Settings/SettingsSlice";
import "./searchResult.styl";

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
        <Typography className="M3-title-medium">
          {t("search.noResults")}
        </Typography>
        <Typography className="M3-Body-medium">
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
  const timeZone = useAppSelector((state) => state.calendars.timeZone);
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
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr", // Stack on mobile
            sm: "90px 120px 35px 1fr", // Simplified on tablets
            md: "90px 120px 35px 220px 150px 250px 1fr", // Full on desktop
          },
          gap: 2,
          p: 3,
          borderTop: "1px solid #F3F6F9",
          cursor: "pointer",
          "&:hover": {
            backgroundColor: "#e7e7e7ff",
          },
          alignItems: "center",
          textAlign: "left",
          maxWidth: "80vw",
        }}
        role="button"
        onClick={() => handleOpenResult(eventData)}
      >
        <Typography className="M3-Body-Large">
          {startDate.toLocaleDateString(t("locale"), {
            day: "2-digit",
            month: "short",
          })}
          {startDate.toDateString() !== endDate.toDateString() && (
            <>
              {" "}
              -{" "}
              {endDate.toLocaleDateString(t("locale"), {
                day: "2-digit",
                month: "short",
              })}
            </>
          )}
        </Typography>
        <Typography className="M3-Body-medium1">
          {!eventData.data.allDay && (
            <>
              {startDate.toLocaleTimeString(t("locale"), {
                hour: "2-digit",
                minute: "2-digit",
              })}
              -
              {endDate.toLocaleTimeString(t("locale"), {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </>
          )}
        </Typography>

        <SquareRoundedIcon
          style={{
            color: calendarColor ?? "#3788D8",
            width: 24,
            height: 24,
          }}
        />
        <Typography className="M3-Body-Large">
          {eventData.data.summary || t("event.untitled")}
        </Typography>
        <Typography
          className="M3-Body-medium1"
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {eventData.data.organizer?.cn ||
            eventData.data.organizer?.email ||
            ""}
        </Typography>
        {eventData.data?.location && (
          <Typography
            className="M3-Body-medium"
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {eventData.data?.location ?? ""}
          </Typography>
        )}
        <Typography
          className="M3-Body-medium3"
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {eventData.data?.description?.replace(/\n/g, " ") ?? ""}
        </Typography>
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
