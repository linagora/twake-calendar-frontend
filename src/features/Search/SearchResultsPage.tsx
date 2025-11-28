import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SquareRoundedIcon from "@mui/icons-material/SquareRounded";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import logo from "../../static/noResult-logo.svg";

import {
  enGB,
  fr as frLocale,
  ru as ruLocale,
  vi as viLocale,
} from "date-fns/locale";
import { setView } from "../Settings/SettingsSlice";
import "./searchResult.styl";

const dateLocales = { en: enGB, fr: frLocale, ru: ruLocale, vi: viLocale };

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
            <ResultItem key={r.data.uid || idx} eventData={r.data} />
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

function ResultItem({ eventData }: { eventData: Record<string, any> }) {
  const { t, lang } = useI18n();
  const locale = dateLocales[lang as keyof typeof dateLocales] || enGB;
  console.log(eventData);
  const startDate = new Date(eventData.start);
  const endDate = new Date(eventData.end);
  const calendarColor = useAppSelector(
    (state) =>
      state.calendars.list[`${eventData.userId}/${eventData.calendarId}`]?.color
        ?.light
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "90px 120px 35px 1fr 150px 1fr 1fr",
        gap: 2,
        p: 3,
        borderTop: "1px solid #F3F6F9",
        cursor: "pointer",
        "&:hover": {
          backgroundColor: "#e7e7e7ff",
        },
        alignItems: "center",
        textAlign: "left",
      }}
    >
      <Typography className="M3-Body-Large">
        {startDate.toLocaleDateString(t("locale"), {
          day: "2-digit",
          month: "short",
        })}
      </Typography>
      <Typography className="M3-Body-medium1">
        {startDate.toLocaleTimeString(t("locale"), {
          hour: "2-digit",
          minute: "2-digit",
        })}
        -
        {endDate.toLocaleTimeString(t("locale"), {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Typography>
      <SquareRoundedIcon
        style={{
          color: calendarColor ?? "#3788D8",
          width: 24,
          height: 24,
        }}
      />
      <Typography className="M3-Body-Large">
        {eventData.summary || t("event.untitled")}
      </Typography>

      <Typography className="M3-Body-medium1">
        {eventData.organizer?.cn || eventData.organizer?.email || ""}
      </Typography>

      <Typography className="M3-Body-medium">
        {eventData?.location ?? ""}
      </Typography>

      <Typography
        className="M3-Body-medium3"
        sx={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {eventData?.description?.replace("\n", " ") ?? ""}
      </Typography>
    </Box>
  );
}
