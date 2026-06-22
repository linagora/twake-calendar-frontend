import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { fetchCurrentUser } from '../UserDao'
import { RejectedError, UserState } from '../UserSlice'
import { OpenPaasUserData } from '../type/OpenPaasUserData'
import { ConfigurationItem, ModuleConfiguration } from '../userDataTypes'

function updateBasicUserData(
  state: UserState,
  payload: OpenPaasUserData
): void {
  state.userData.name = payload.firstname ?? ''
  state.userData.family_name = payload.lastname ?? ''
  state.userData.openpaasId = payload.id
}

function updateOrganizerData(
  state: UserState,
  payload: OpenPaasUserData
): void {
  if (!state.organiserData) {
    state.organiserData = {} as { cn: string; cal_address: string }
  }
  if (payload.firstname && payload.lastname) {
    state.organiserData.cn = `${payload.firstname} ${payload.lastname}`
  }
  if (payload.preferredEmail) {
    state.organiserData.cal_address = payload.preferredEmail
    state.userData.email = payload.preferredEmail
  }
}

function applyCoreModuleConfig(
  state: UserState,
  configurations: ConfigurationItem[]
): void {
  const newCoreConfig = Object.fromEntries(
    configurations.map(e => [e.name, e.value])
  )
  state.coreConfig = {
    ...state.coreConfig,
    ...newCoreConfig
  }

  applyLanguageConfig(state, configurations)
  applyDatetimeConfig(state, configurations)
}

function applyLanguageConfig(
  state: UserState,
  configurations: ConfigurationItem[]
): void {
  const languageConfig = configurations.find(
    config => config.name === 'language'
  )
  if (languageConfig?.value) {
    state.coreConfig.language = languageConfig.value as string
    if (state.userData) {
      state.userData.language = languageConfig.value as string
    }
  }
}

function applyDatetimeConfig(
  state: UserState,
  configurations: ConfigurationItem[]
): void {
  const datetimeConfig = configurations.find(
    config => config.name === 'datetime'
  )

  const datetimeValue =
    datetimeConfig?.value && typeof datetimeConfig.value === 'object'
      ? (datetimeConfig.value as { timeZone?: string })
      : {}
  const timeZone = datetimeValue.timeZone ?? null

  state.coreConfig.datetime = {
    ...state.coreConfig.datetime,
    ...datetimeValue,
    timeZone
  }
  state.userData.timezone = timeZone
}

function applyCalendarModuleConfig(
  state: UserState,
  modules: ModuleConfiguration[]
): void {
  const calendarModule = modules.find(module => module.name === 'calendar')
  if (!calendarModule?.configurations) return

  const alarmEmailsConfig = calendarModule.configurations.find(
    config => config.name === 'alarmEmails'
  )
  if (alarmEmailsConfig) {
    state.alarmEmailsEnabled = alarmEmailsConfig.value === true
  }
}

function applyModuleConfigurations(
  state: UserState,
  payload: OpenPaasUserData
): void {
  if (!payload.configurations?.modules) return

  const coreModule = payload.configurations.modules.find(
    module => module.name === 'core'
  )
  if (coreModule?.configurations) {
    applyCoreModuleConfig(state, coreModule.configurations)
  }

  applyCalendarModuleConfig(state, payload.configurations.modules)
}

export const getOpenPaasUserDataThunk = (create: ReducerCreators<UserState>) =>
  create.asyncThunk<OpenPaasUserData, void, { rejectValue: RejectedError }>(
    async (_, { rejectWithValue }) => {
      try {
        const user = await fetchCurrentUser()
        return user
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.loading = true
      },
      fulfilled: (state, action) => {
        updateBasicUserData(state, action.payload)
        updateOrganizerData(state, action.payload)
        applyModuleConfigurations(state, action.payload)
        state.loading = false
      },
      rejected: (state, action) => {
        state.loading = false
        if (action.payload?.status !== 401) {
          state.error =
            action.payload?.message || 'Failed to fetch user information'
        }
      }
    }
  )
