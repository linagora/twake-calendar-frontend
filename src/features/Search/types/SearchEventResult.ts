import { SearchEventData } from "./SearchEventData";

export type SearchEventResult = {
  data: SearchEventData;
  _links: {
    self: {
      href: string;
    };
  };
};
