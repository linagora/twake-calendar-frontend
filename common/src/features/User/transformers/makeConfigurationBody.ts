import { BusinessHour } from '@common/features/Settings/SettingsSlice'
import { businessHoursToIso } from '@common/features/Settings/businessHoursDays'
import type { ThemeSetting } from '@common/features/Settings/constants'
import { ConfigurationItem, ModuleConfiguration } from '../userDataTypes'

export interface DatetimeConfiguration {
  timeZone?: string | null
  autoDetect?: boolean
}

export interface ConfigurationUpdatesInput {
  language?: string
  theme?: ThemeSetting
  notifications?: Record<string, unknown>
  timezone?: string | null
  autoDetectTimezone?: boolean
  displayWeekNumbers?: boolean
  previousConfig?: Record<string, unknown>
  alarmEmails?: boolean
  hideDeclinedEvents?: boolean
  workingDays?: boolean
  businessHours?: BusinessHour | null
}

export interface ConfigurationBody {
  modules: ModuleConfiguration[]
}

function pushIfDefined(
  configs: ConfigurationItem[],
  name: string,
  value: unknown
): void {
  if (value !== undefined) {
    configs.push({ name, value })
  }
}

// The backend merges the datetime configuration as a whole and not sub field
// by sub field: whatever is left out falls back to its default, so the known
// configuration is carried over and only the updated fields overwrite it.
function buildDatetimeValue(
  updates: ConfigurationUpdatesInput
): DatetimeConfiguration {
  const previousDatetime = updates.previousConfig?.datetime as
    | DatetimeConfiguration
    | undefined

  return {
    ...previousDatetime,
    ...(updates.timezone !== undefined ? { timeZone: updates.timezone } : {}),
    ...(updates.autoDetectTimezone !== undefined
      ? { autoDetect: updates.autoDetectTimezone }
      : {})
  }
}

function buildCoreConfigs(
  updates: ConfigurationUpdatesInput
): ConfigurationItem[] {
  const configs: ConfigurationItem[] = []
  pushIfDefined(configs, 'language', updates.language)
  pushIfDefined(configs, 'theme', updates.theme)
  pushIfDefined(configs, 'notifications', updates.notifications)
  pushIfDefined(
    configs,
    'businessHours',
    updates.businessHours
      ? [businessHoursToIso(updates.businessHours)]
      : updates.businessHours
  )

  if (
    updates.timezone !== undefined ||
    updates.autoDetectTimezone !== undefined
  ) {
    configs.push({ name: 'datetime', value: buildDatetimeValue(updates) })
  }

  return configs
}

function buildCalendarConfigs(
  updates: ConfigurationUpdatesInput
): ConfigurationItem[] {
  const configs: ConfigurationItem[] = []
  pushIfDefined(configs, 'alarmEmails', updates.alarmEmails)
  pushIfDefined(configs, 'displayWeekNumbers', updates.displayWeekNumbers)
  return configs
}

function buildEsnCalendarConfigs(
  updates: ConfigurationUpdatesInput
): ConfigurationItem[] {
  const configs: ConfigurationItem[] = []
  pushIfDefined(configs, 'hideDeclinedEvents', updates.hideDeclinedEvents)
  pushIfDefined(configs, 'workingDays', updates.workingDays)
  return configs
}

function buildModule(
  name: string,
  configurations: ConfigurationItem[]
): ModuleConfiguration | null {
  return configurations.length > 0 ? { name, configurations } : null
}

export function makeConfigurationBody(
  updates: ConfigurationUpdatesInput
): ConfigurationBody {
  const modules: ModuleConfiguration[] = []

  const core = buildModule('core', buildCoreConfigs(updates))
  if (core) modules.push(core)

  const calendar = buildModule('calendar', buildCalendarConfigs(updates))
  if (calendar) modules.push(calendar)

  const esnCalendar = buildModule(
    'linagora.esn.calendar',
    buildEsnCalendarConfigs(updates)
  )
  if (esnCalendar) modules.push(esnCalendar)

  return { modules }
}
