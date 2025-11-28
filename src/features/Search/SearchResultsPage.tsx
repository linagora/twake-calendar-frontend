import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
import { useAppSelector } from "../../app/hooks";
import logo from "../../static/noResult-logo.svg";
import CircularProgress from "@mui/material/CircularProgress";
import { Box, Card, CardContent, Typography, Chip, Stack } from "@mui/material";
import { format } from "date-fns";
import {
  enGB,
  fr as frLocale,
  ru as ruLocale,
  vi as viLocale,
} from "date-fns/locale";

const dateLocales = { en: enGB, fr: frLocale, ru: ruLocale, vi: viLocale };

export default function SearchResultsPage() {
  const { t } = useI18n();
  const { error, loading, hits, results } = useAppSelector(
    (state) => state.searchResult
  );

  if (loading) {
    return (
      <div className="search-layout">
        <CircularProgress size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-layout">
        <div style={{ color: "red", marginTop: 8 }}>{error}</div>
      </div>
    );
  }

  if (!hits) {
    return (
      <div className="search-layout">
        <h1>{t("search.noResults")}</h1>
        <img className="logo" src={logo} alt={t("search.noResults")} />
      </div>
    );
  }

  return (
    <div className="search-layout">
      <h1>{t("search.resultsTitle")}</h1>
      <Stack spacing={2} sx={{ mt: 2 }}>
        {results?.map((r: any, idx: number) => (
          <ResultItem key={r.data.uid || idx} eventData={r.data} />
        ))}
      </Stack>
    </div>
  );
}

function ResultItem({ eventData }: { eventData: Record<string, any> }) {
  const { lang } = useI18n();
  const locale = dateLocales[lang as keyof typeof dateLocales] || enGB;

  const startDate = new Date(eventData.start);

  const formatDateTime = (date: Date) => {
    if (eventData.allDay) {
      return format(date, "PPP", { locale });
    }
    return format(date, "PPP p", { locale });
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "200px 1fr 200px",
        gap: 2,
        p: 2,
        borderBottom: "1px solid #e0e0e0",
        cursor: "pointer",
        "&:hover": {
          backgroundColor: "#f5f5f5",
        },
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {formatDateTime(startDate)}
      </Typography>

      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        {eventData.summary || "Untitled Event"}
      </Typography>

      <Typography variant="body2" color="text.secondary">
        {eventData.organizer?.cn || eventData.organizer?.email || "-"}
      </Typography>
    </Box>
  );
}
