export interface DavSyncItem {
  status: number;
  _links: {
    self: {
      href: string;
    };
  };
}

export interface DavSyncResponse {
  _embedded?: {
    "dav:item"?: DavSyncItem[];
  };
  "sync-token"?: string;
}
