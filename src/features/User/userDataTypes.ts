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
  modules?: ModuleConfiguration[];
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
// Type for search response from the API
export interface SearchResponseItem {
  id?: string;
  emailAddresses?: Array<{ value?: string }>;
  names?: Array<{ displayName?: string }>;
  photos?: Array<{ url?: string }>;
}

// Type for configuration item
export interface ConfigurationItem {
  name: string;
  value: unknown;
}

// Type for module configuration
export interface ModuleConfiguration {
  name: string;
  configurations: ConfigurationItem[];
}
