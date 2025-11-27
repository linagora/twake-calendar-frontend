import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
import { useAppSelector } from "../../app/hooks";
import logo from "../../static/noResult-logo.svg";
import CircularProgress from "@mui/material/CircularProgress"; // or your app spinner

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

  if (hits === 0) {
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
      {results?.map((r: any, idx: number) => (
        <div key={r.id ?? idx}>{JSON.stringify(r.data)}</div>
      ))}
    </div>
  );
}
