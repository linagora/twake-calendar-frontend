import { VObjectProperty } from '@common/features/Calendars/types/CalendarData'

export interface userData {
  email: string
  family_name: string
  given_name: string
  name: string
  sid: string
  sub: string
  openpaasId?: string
  language?: string
  timezone?: string | null
}

export interface UserConfigurations {
  modules?: ModuleConfiguration[]
}

export interface NotificationSettings {
  email?: boolean
  push?: boolean
}

export type NotificationSettingsExtended = NotificationSettings & {
  [key: string]: unknown
}

export class userOrganiser {
  cn: string
  cal_address: string

  constructor({ cn, cal_address }: { cn?: string; cal_address?: string } = {}) {
    this.cn = cn ?? ''
    this.cal_address = cal_address ?? ''
  }

  asMailto(): string {
    return `mailto:${this.cal_address.replace(/^mailto:/i, '')}`
  }

  asJcal(): VObjectProperty {
    return [
      'organizer',
      this.cn ? { cn: this.cn } : {},
      'cal-address',
      this.asMailto()
    ]
  }
}
// Type for configuration item
export interface ConfigurationItem {
  name: string
  value: unknown
}

// Type for module configuration
export interface ModuleConfiguration {
  name: string
  configurations: ConfigurationItem[]
}
