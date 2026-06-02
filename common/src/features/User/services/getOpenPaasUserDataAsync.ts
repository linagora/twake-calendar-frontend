import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { getOpenPaasUser } from '../userAPI'
import { OpenPaasUserData } from '../type/OpenPaasUserData'
import { UserState, RejectedError } from '../UserSlice'

export const getOpenPaasUserDataThunk = (create: ReducerCreators<UserState>) =>
  create.asyncThunk<OpenPaasUserData, void, { rejectValue: RejectedError }>(
    async (_, { rejectWithValue }) => {
      try {
        const user = await getOpenPaasUser()
        return user
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.loading = true
      },
      settled: state => {
        state.loading = false
      },
      fulfilled: (state, action) => {
        state.userData.name = action.payload.firstname ?? ''
        state.userData.family_name = action.payload.lastname ?? ''
        state.userData.openpaasId = action.payload.id
        if (!state.organiserData) {
          state.organiserData = {} as { cn: string; cal_address: string }
        }
        if (action.payload.firstname && action.payload.lastname) {
          state.organiserData.cn = `${action.payload.firstname} ${action.payload.lastname}`
        }
        if (action.payload.preferredEmail) {
          state.organiserData.cal_address = action.payload.preferredEmail
          state.userData.email = action.payload.preferredEmail
        }
        // Extract data from configurations.modules
        if (action.payload.configurations?.modules) {
          const coreModule = action.payload.configurations.modules.find(
            module => module.name === 'core'
          )
          if (coreModule?.configurations) {
            const newCoreConfig = Object.fromEntries(
              coreModule.configurations.map(e => [e.name, e.value])
            )
            state.coreConfig = {
              ...state.coreConfig,
              ...newCoreConfig
            }
            const languageConfig = coreModule.configurations.find(
              config => config.name === 'language'
            )
            if (languageConfig?.value) {
              state.coreConfig.language = languageConfig.value as string
              if (state.userData)
                state.userData.language = languageConfig.value as string
            }
            const datetimeConfig = coreModule.configurations.find(
              config => config.name === 'datetime'
            )
            if (datetimeConfig?.value) {
              const datetimeValue = datetimeConfig.value as {
                timeZone?: string
              }
              const serverTimeZone = datetimeValue.timeZone
              state.coreConfig.datetime = {
                ...state.coreConfig.datetime,
                ...(typeof datetimeConfig.value === 'object' &&
                datetimeConfig.value !== null
                  ? datetimeConfig.value
                  : {}),
                timeZone: serverTimeZone !== undefined ? serverTimeZone : null
              }
              if (state.userData) {
                state.userData.timezone =
                  serverTimeZone !== undefined ? serverTimeZone : null
              }
            } else {
              state.coreConfig.datetime = {
                ...state.coreConfig.datetime,
                timeZone: null
              }
              if (state.userData) {
                state.userData.timezone = null
              }
            }
          }
          // Extract alarmEmails from configurations.modules
          const calendarModule = action.payload.configurations.modules.find(
            module => module.name === 'calendar'
          )
          if (calendarModule?.configurations) {
            const alarmEmailsConfig = calendarModule.configurations.find(
              config => config.name === 'alarmEmails'
            )
            if (alarmEmailsConfig) {
              state.alarmEmailsEnabled = alarmEmailsConfig.value === true
            }
          }
        }
      },
      rejected: (state, action) => {
        if (action.payload?.status !== 401) {
          state.error =
            action.payload?.message || 'Failed to fetch user information'
        }
      }
    }
  )
