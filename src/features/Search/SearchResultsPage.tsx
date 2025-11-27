import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
import React from "react";
import { useAppSelector } from "../../app/hooks";
import logo from "../../static/noResult-logo.svg";

export default function SearchResultsPage() {
  const { t } = useI18n();
  const { hits, results } = useAppSelector((state) => state.searchResult);

  if (hits === 0) {
    <div className="search-layout">
      <h1>no Results</h1>
      <img className="logo" src={logo} alt={t("search.noResults")} />
    </div>;
  }

  return (
    <div className="search-layout">
      <h1>Search Results</h1>
      {results?.map((r) => (
        <div>{JSON.stringify(r.data)}</div>
      ))}
    </div>
  );
}
