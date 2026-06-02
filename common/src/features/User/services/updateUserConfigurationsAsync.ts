import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { updateUserConfigurations, UserConfigurationUpdates } from '../userAPI'
import { UserState, RejectedError } from '../UserSlice'

export const updateUserConfigurationsThunk = (
  create: ReducerCreators<UserState>
) =>
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
        if (action.payload.language !== undefined) {
          state.coreConfig.language = action.payload.language
          if (state.userData) {
            state.userData.language = action.payload.language
          }
        }
        if (action.payload.timezone !== undefined) {
          if (!state.coreConfig.datetime) {
            state.coreConfig.datetime = { timeZone: null }
          }
          state.coreConfig.datetime.timeZone = action.payload.timezone
          if (state.userData) {
            state.userData.timezone = action.payload.timezone
          }
        }
        if (action.payload.alarmEmails !== undefined) {
          state.alarmEmailsEnabled = action.payload.alarmEmails === true
        }
      },
      rejected: (state, action) => {
        if (action.payload?.status !== 401) {
          state.error =
            action.payload?.message || 'Failed to update user configurations'
        }
      }
    }
  )
