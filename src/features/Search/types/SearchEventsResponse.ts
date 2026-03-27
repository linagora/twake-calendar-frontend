import { SearchEventResult } from "./SearchEventResult";

export type SearchEventsResponse = {
  _total_hits?: number | string;
  _embedded?: {
    events?: SearchEventResult[];
  };
};
