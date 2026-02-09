export type SearchEventsResponse = {
  _total_hits?: number | string;
  _embedded?: {
    events?: Record<string, unknown>[];
  };
};
