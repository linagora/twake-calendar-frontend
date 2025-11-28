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

  if (loading) {
    return (
      <Box className="search-layout loading">
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="search-layout error">
        <Typography style={{ color: "red", marginTop: 8 }}>{error}</Typography>{" "}
        <Typography
          variant="subtitle2"
          sx={{
            cursor: "pointer",
            color: "#8C9CAF",
            textDecoration: "underline",
          }}
          onClick={() => dispatch(setView("calendar"))}
          aria-label={t("settings.back") || "Back to calendar"}
        >
          {t("settings.back")}
        </Typography>
      </Box>
    );
  }

  if (!hits) {
    return (
      <Box className="search-layout noResults">
        <img className="logo" src={logo} alt={t("search.noResults")} />
        <Typography>{t("search.noResults")}</Typography>
        <Typography>{t("settings.back")}</Typography>
        <Typography
          variant="subtitle2"
          sx={{
            cursor: "pointer",
            color: "#8C9CAF",
            textDecoration: "underline",
          }}
          onClick={() => dispatch(setView("calendar"))}
          aria-label={t("settings.back") || "Back to calendar"}
        >
          {t("settings.back")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="search-layout">
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            p: 2,
            alignItems: "center",
            alignContent: "center",
          }}
        >
          <Button
            onClick={() => dispatch(setView("calendar"))}
            className="back-button"
            sx={{
              color: "#8C9CAF",
            }}
            aria-label={t("settings.back") || "Back to calendar"}
            startIcon={<ArrowBackIcon />}
          >
            {t("settings.back")}
          </Button>
        </Box>

        {results?.map((r: any, idx: number) => (
          <ResultItem key={r.data.uid || idx} eventData={r.data} />
        ))}
      </Stack>
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
        display: "flex",
        gap: 2,
        p: 2,
        borderBottom: "1px solid #e0e0e0",
        cursor: "pointer",
        "&:hover": {
          backgroundColor: "#f5f5f5",
        },
      }}
    >
      <Typography
        sx={{
          fontFamily: "Roboto",
          fontWeight: "400",
          fontStyle: "Regular",
          fontSize: "22px",
          lineHeight: "28px",
          letterSpacing: "0%",
          color: "#243B55",
        }}
      >
        {startDate.toLocaleDateString(t("locale"), {
          day: "2-digit",
          month: "short",
        })}
      </Typography>

      <Typography
        sx={{
          fontFamily: "Inter",
          fontWeight: "400",
          fontStyle: "Regular",
          fontSize: "16px",
          lineHeight: "24px",
          letterSpacing: "-0.15px",
          color: "#243B55",
        }}
      >
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

      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        {eventData.summary || t("event.untitled")}
      </Typography>

      <Typography variant="body2" color="text.secondary">
        {eventData.organizer?.cn || eventData.organizer?.email || "-"}
      </Typography>
    </Box>
  );
}
