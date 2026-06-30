import { createAppSlice } from '@common/app/createAppSlice'
import { PayloadAction } from '@reduxjs/toolkit'
import {
  getOpenPaasUserDataThunk,
  updateUserConfigurationsThunk
} from './services'
import { userData, userOrganiser } from './userDataTypes'

// Type for core config datetime
interface DatetimeConfig {
  timeZone: string | null
  [key: string]: unknown
}

// Type for core config
interface CoreConfig {
  language: string | null
  datetime: DatetimeConfig
  [key: string]: unknown
}

export interface RejectedError {
  message: string
  status?: number
}

export interface UserState {
  userData: userData
  organiserData: userOrganiser
  tokens: Record<string, string> | null
  coreConfig: CoreConfig
  alarmEmailsEnabled: boolean | null
  loading: boolean
  error: string | null
}

const UserSlice = createAppSlice({
  name: 'user',
  initialState: {
    userData: {} as userData,
    organiserData: new userOrganiser(),
    tokens: null,
    coreConfig: {
      language: null,
      datetime: {
        timeZone: null
      }
    } as CoreConfig,
    alarmEmailsEnabled: null,
    loading: true,
    error: null
  } as UserState,
  reducers: create => ({
    // Regular reducers
    setUserData: create.reducer((state, action: PayloadAction<userData>) => {
      state.userData = action.payload
      // Reassign a full-fledged userOrganiser instance so that consumers (e.g.
      // makeVevent) can rely on its methods (asJcal/asMailto) being available.
      state.organiserData = new userOrganiser({
        cn: action.payload.sub,
        cal_address: `mailto:${action.payload.email}`
      })
      state.loading = false
    }),
    setTokens: create.reducer(
      (state, action: PayloadAction<Record<string, string>>) => {
        state.tokens = action.payload
      }
    ),
    setLanguage: create.reducer((state, action: PayloadAction<string>) => {
      state.coreConfig.language = action.payload
      if (state.userData) {
        state.userData.language = action.payload
      }
    }),
    setTimezone: create.reducer(
      (state, action: PayloadAction<string | null>) => {
        if (!state.coreConfig.datetime) {
          state.coreConfig.datetime = { timeZone: null }
        }
        state.coreConfig.datetime.timeZone = action.payload
        if (state.userData) {
          state.userData.timezone = action.payload
        }
      }
    ),
    setAlarmEmails: create.reducer((state, action: PayloadAction<boolean>) => {
      state.alarmEmailsEnabled = action.payload
    }),
    setUserError: create.reducer((state, action: PayloadAction<string>) => {
      state.error = action.payload
    }),
    clearError: create.reducer(state => {
      state.error = null
    }),
    // Thunks using create.asyncThunk
    getOpenPaasUserData: getOpenPaasUserDataThunk(create),
    updateUserConfigurations: updateUserConfigurationsThunk(create)
  })
})

export const {
  setUserData,
  setTokens,
  setLanguage,
  setTimezone,
  setAlarmEmails,
  setUserError,
  clearError,
  // Thunks
  getOpenPaasUserData,
  updateUserConfigurations
} = UserSlice.actions

export default UserSlice.reducer
