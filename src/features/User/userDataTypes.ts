export interface userData {
  email: string;
  family_name: string;
  given_name: string;
  name: string;
  sid: string;
  sub: string;
  openpaasId?: string;
  language?: string;
  timezone?: string | null;
}

export interface UserConfigurations {
  modules?: Array<{
    name: string;
    configurations?: Array<{
      name: string;
      value: any;
    }>;
  }>;
}

export interface NotificationSettings {
  email?: boolean;
  push?: boolean;
}

export type NotificationSettingsExtended = NotificationSettings & {
  [key: string]: unknown;
};

export interface userOrganiser {
  cn: string;
  cal_address: string;
}
