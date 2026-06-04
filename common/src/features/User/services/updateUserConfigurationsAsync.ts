import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { updateUserConfigurations, UserConfigurationUpdates } from '../userAPI'
import { UserState, RejectedError } from '../UserSlice'

function applyLanguageUpdate(
  state: UserState,
  language: string | undefined
): void {
  if (!language) return

  state.coreConfig.language = language
  if (state.userData) {
    state.userData.language = language
  }
}

function applyTimezoneUpdate(
  state: UserState,
  timezone: string | null | undefined
): void {
  if (!timezone) return

  if (!state.coreConfig.datetime) {
    state.coreConfig.datetime = { timeZone: null }
  }
  state.coreConfig.datetime.timeZone = timezone
  if (state.userData) {
    state.userData.timezone = timezone
  }
}

function applyAlarmEmailsUpdate(
  state: UserState,
  alarmEmails: boolean | undefined
): void {
  if (!alarmEmails) return

  state.alarmEmailsEnabled = alarmEmails === true
}

export const updateUserConfigurationsThunk = (
  create: ReducerCreators<UserState>
): ReturnType<
  typeof create.asyncThunk<
    UserConfigurationUpdates,
    UserConfigurationUpdates,
    { rejectValue: RejectedError }
  >
> =>
  create.asyncThunk<
    UserConfigurationUpdates,
    UserConfigurationUpdates,
    { rejectValue: RejectedError }
  >(
    async (updates, { rejectWithValue }) => {
      try {
        await updateUserConfigurations(updates)
        return updates
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      fulfilled: (state, action) => {
        applyLanguageUpdate(state, action.payload.language)
        applyTimezoneUpdate(state, action.payload.timezone)
        applyAlarmEmailsUpdate(state, action.payload.alarmEmails)
      },
      rejected: (state, action) => {
        state.error =
          action.payload?.message || 'Failed to update user configurations'
      }
    }
  )
