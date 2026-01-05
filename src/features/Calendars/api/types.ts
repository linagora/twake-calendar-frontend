export interface DavSyncItem {
  status: number;
  _links: CalDavLink;
}

export type CalDavLink = {
  self?: {
    href?: string;
  };
};

export type CalDavItem = {
  data?: unknown[];
  _links?: CalDavLink;
};

export interface DavSyncResponse {
  _embedded?: {
    "dav:item"?: DavSyncItem[];
  };
  "sync-token"?: string;
}
