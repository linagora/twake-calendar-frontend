import { User } from '@/components/Attendees/types'
import { isValidEmail } from '@/utils/isValidEmail'
import { BusinessHour } from '../Settings/SettingsSlice'
import { OpenPaasUserData } from './type/OpenPaasUserData'
import {
  fetchCurrentUser,
  fetchUserByEmail,
  fetchUserById,
  patchConfigurations,
  searchPeople
} from './UserDao'
import { ConfigurationItem, ModuleConfiguration } from './userDataTypes'

export async function getOpenPaasUser() {
  return fetchCurrentUser()
}

export async function searchUsers(
  query: string,
  objectTypes: string[] = ['user', 'contact']
): Promise<User[]> {
  const response = await searchPeople(query, objectTypes)

  return response.map(user => ({
    email: user.emailAddresses?.[0]?.value || '',
    displayName:
      user.names?.[0]?.displayName || user.emailAddresses?.[0]?.value || '',
    avatarUrl: user.photos?.[0]?.url || '',
    openpaasId: user.id || '',
    objectType: user.objectType
  }))
}

export async function getUserDetails(id: string): Promise<OpenPaasUserData> {
  return fetchUserById(id)
}

export interface UserConfigurationUpdates {
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

export async function updateUserConfigurations(
  updates: UserConfigurationUpdates
): Promise<Response | { status: number }> {
  const coreConfigs: ConfigurationItem[] = []
  const calendarConfigs: ConfigurationItem[] = []
  const esnCalendarConfigs: ConfigurationItem[] = []

  if (updates.language !== undefined) {
    coreConfigs.push({ name: 'language', value: updates.language })
  }
  if (updates.notifications !== undefined) {
    coreConfigs.push({ name: 'notifications', value: updates.notifications })
  }
  if (updates.timezone !== undefined) {
    const previousDatetime = updates.previousConfig?.datetime as
      | { timeZone?: string }
      | undefined
    coreConfigs.push({
      name: 'datetime',
      value: {
        ...previousDatetime,
        timeZone: updates.timezone
      }
    })
  }
  if (updates.businessHours !== undefined) {
    coreConfigs.push({
      name: 'businessHours',
      value: updates.businessHours ? [updates.businessHours] : []
    })
  }
  if (updates.alarmEmails !== undefined) {
    calendarConfigs.push({
      name: 'alarmEmails',
      value: updates.alarmEmails
    })
  }
  if (updates.displayWeekNumbers !== undefined) {
    calendarConfigs.push({
      name: 'displayWeekNumbers',
      value: updates.displayWeekNumbers
    })
  }
  if (updates.hideDeclinedEvents !== undefined) {
    esnCalendarConfigs.push({
      name: 'hideDeclinedEvents',
      value: updates.hideDeclinedEvents
    })
  }
  if (updates.workingDays !== undefined) {
    esnCalendarConfigs.push({
      name: 'workingDays',
      value: updates.workingDays
    })
  }

  const modules: ModuleConfiguration[] = []

  if (coreConfigs.length > 0) {
    modules.push({
      name: 'core',
      configurations: coreConfigs
    })
  }

  if (calendarConfigs.length > 0) {
    modules.push({
      name: 'calendar',
      configurations: calendarConfigs
    })
  }
  if (esnCalendarConfigs.length > 0) {
    modules.push({
      name: 'linagora.esn.calendar',
      configurations: esnCalendarConfigs
    })
  }

  if (modules.length === 0) {
    return Promise.resolve({ status: 204 })
  }

  return await patchConfigurations(modules)
}

export async function getUserDataFromEmail(
  email: string
): Promise<Array<Record<string, string>>> {
  if (!isValidEmail(email)) return []
  return fetchUserByEmail(email)
}
