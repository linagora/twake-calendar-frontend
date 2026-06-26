import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { patchConfigurations } from '../UserDao'
import { RejectedError, UserState } from '../UserSlice'
import {
  ConfigurationUpdatesInput,
  makeConfigurationBody
} from '../transformers'

type StateUpdater = (
  state: UserState,
  payload: ConfigurationUpdatesInput
) => void

const stateUpdaters: Array<{
  key: keyof ConfigurationUpdatesInput
  updater: StateUpdater
}> = [
  {
    key: 'language',
    updater: (state, payload): void => {
      if (!payload.language) return
      state.coreConfig.language = payload.language
      if (state.userData) {
        state.userData.language = payload.language
      }
    }
  },
  {
    key: 'timezone',
    updater: (state, payload): void => {
      if (payload.timezone === undefined) return
      if (!state.coreConfig.datetime) {
        state.coreConfig.datetime = { timeZone: null }
      }
      state.coreConfig.datetime.timeZone = payload.timezone
      if (state.userData) {
        state.userData.timezone = payload.timezone
      }
    }
  },
  {
    key: 'alarmEmails',
    updater: (state, payload): void => {
      if (payload.alarmEmails === undefined) return
      state.alarmEmailsEnabled = Boolean(payload.alarmEmails)
    }
  }
]

function applyUpdates(
  state: UserState,
  payload: ConfigurationUpdatesInput
): void {
  stateUpdaters.forEach(({ key, updater }) => {
    if (payload[key]) {
      updater(state, payload)
    }
  })
}

export const updateUserConfigurationsThunk = (
  create: ReducerCreators<UserState>
): ReturnType<
  typeof create.asyncThunk<
    ConfigurationUpdatesInput,
    ConfigurationUpdatesInput,
    { rejectValue: RejectedError }
  >
> =>
  create.asyncThunk<
    ConfigurationUpdatesInput,
    ConfigurationUpdatesInput,
    { rejectValue: RejectedError }
  >(
    async (updates, { rejectWithValue }) => {
      try {
        const body = makeConfigurationBody(updates)
        if (!body.modules?.length) {
          return updates
        }
        await patchConfigurations(body.modules)
        return updates
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      fulfilled: (state, action) => {
        applyUpdates(state, action.payload)
      },
      rejected: (state, action) => {
        state.error =
          action.payload?.message || 'Failed to update user configurations'
      }
    }
  )
