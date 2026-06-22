import { BusinessHour } from '@common/features/Settings/SettingsSlice'
import { ConfigurationItem, ModuleConfiguration } from '../userDataTypes'

export interface ConfigurationUpdatesInput {
  language?: string
  notifications?: Record<string, unknown>
  timezone?: string | null
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

function buildCoreConfigs(
  updates: ConfigurationUpdatesInput
): ConfigurationItem[] {
  const configs: ConfigurationItem[] = []
  pushIfDefined(configs, 'language', updates.language)
  pushIfDefined(configs, 'notifications', updates.notifications)
  pushIfDefined(
    configs,
    'businessHours',
    updates.businessHours ? [updates.businessHours] : updates.businessHours
  )

  if (updates.timezone !== undefined) {
    const previousDatetime = updates.previousConfig?.datetime as
      | { timeZone?: string }
      | undefined
    configs.push({
      name: 'datetime',
      value: { ...previousDatetime, timeZone: updates.timezone }
    })
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
