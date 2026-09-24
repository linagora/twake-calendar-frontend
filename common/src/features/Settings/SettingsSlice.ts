import { createAppSlice } from '@common/app/createAppSlice'
import {
  ConfigurationItem,
  ModuleConfiguration
} from '@common/features/User/userDataTypes'
import { getOpenPaasUserData } from '@common/features/User/UserSlice'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import { PayloadAction } from '@reduxjs/toolkit'
import { businessHoursFromIso } from './businessHoursDays'

export interface BusinessHour {
  start: string
  end: string
  daysOfWeek: number[]
}

export interface SettingsState {
  language: string
  timeZone: string | null // Allow null to represent browser default
  isBrowserDefaultTimeZone: boolean
  // set when the user picks a zone while a user data fetch is in flight
  timeZonePickedDuringUserDataFetch: boolean
  hideDeclinedEvents: boolean | null
  displayWeekNumbers: boolean
  view: 'calendar' | 'settings' | 'search'
  businessHours: BusinessHour | null
  workingDays: boolean | null
}

const savedLang = localStorage.getItem('lang')
const defaultLang = savedLang ?? window.LANG ?? 'en'

const savedTimeZone = localStorage.getItem('timeZone')
// If savedTimeZone is the string "null" or doesn't exist, use null
const defaultTimeZone =
  savedTimeZone === 'null' || !savedTimeZone ? null : savedTimeZone

const applyServerTimeZone = (
  state: SettingsState,
  serverTimeZone: string | undefined
) => {
  state.timeZone = serverTimeZone || browserDefaultTimeZone
  state.isBrowserDefaultTimeZone = !serverTimeZone
  localStorage.setItem('timeZone', state.timeZone)
}

const SettingsSlice = createAppSlice({
  name: 'settings',
  initialState: {
    language: defaultLang,
    timeZone: defaultTimeZone,
    isBrowserDefaultTimeZone: defaultTimeZone === null,
    timeZonePickedDuringUserDataFetch: false,
    hideDeclinedEvents: null,
    displayWeekNumbers: true,
    view: 'calendar',
    businessHours: null,
    workingDays: null
  } as SettingsState,
  reducers: create => ({
    setLanguage: create.reducer((state, action: PayloadAction<string>) => {
      state.language = action.payload
      localStorage.setItem('lang', action.payload)
    }),
    setTimeZone: create.reducer((state, action: PayloadAction<string>) => {
      state.timeZone = action.payload
      state.timeZonePickedDuringUserDataFetch = true
      localStorage.setItem('timeZone', action.payload)
    }),
    setIsBrowserDefaultTimeZone: create.reducer(
      (state, action: PayloadAction<boolean>) => {
        state.isBrowserDefaultTimeZone = action.payload
        state.timeZonePickedDuringUserDataFetch = true
      }
    ),
    setHideDeclinedEvents: create.reducer(
      (state, action: PayloadAction<boolean | null>) => {
        state.hideDeclinedEvents = action.payload
      }
    ),
    setDisplayWeekNumbers: create.reducer(
      (state, action: PayloadAction<boolean>) => {
        state.displayWeekNumbers = action.payload
      }
    ),
    setView: create.reducer(
      (state, action: PayloadAction<'calendar' | 'settings' | 'search'>) => {
        state.view = action.payload
      }
    ),
    setBusinessHours: create.reducer(
      (state, action: PayloadAction<BusinessHour | null>) => {
        state.businessHours = action.payload ?? null
      }
    ),
    setWorkingDays: create.reducer(
      (state, action: PayloadAction<boolean | null>) => {
        state.workingDays = action.payload
      }
    )
  }),
  extraReducers: builder => {
    builder.addCase(getOpenPaasUserData.pending, state => {
      state.timeZonePickedDuringUserDataFetch = false
    })
    builder.addCase(getOpenPaasUserData.fulfilled, (state, action) => {
      const coreModule = action.payload.configurations?.modules?.find(
        (module: ModuleConfiguration) => module.name === 'core'
      )
      const datetimeConfig = coreModule?.configurations?.find(
        (config: ConfigurationItem) => config.name === 'datetime'
      )
      const datetimeValue = datetimeConfig?.value as
        | { timeZone?: string }
        | undefined
      const timeZone = datetimeValue?.timeZone

      // a zone the user picked while this fetch was in flight must not be
      // clobbered by the (now stale) server value
      if (!state.timeZonePickedDuringUserDataFetch) {
        applyServerTimeZone(state, timeZone)
      }
      const esnCalendarModule = action.payload.configurations?.modules?.find(
        (module: ModuleConfiguration) => module.name === 'linagora.esn.calendar'
      )
      const hideDeclinedEventsConfig = esnCalendarModule?.configurations?.find(
        (config: ConfigurationItem) => config.name === 'hideDeclinedEvents'
      )
      state.hideDeclinedEvents =
        typeof hideDeclinedEventsConfig?.value === 'boolean'
          ? hideDeclinedEventsConfig.value
          : null

      const businessHoursConfig = coreModule?.configurations?.find(
        (config: ConfigurationItem) => config.name === 'businessHours'
      )
      state.businessHours =
        Array.isArray(businessHoursConfig?.value) &&
        businessHoursConfig?.value?.[0]
          ? businessHoursFromIso(businessHoursConfig.value[0])
          : null

      // From esnCalendarModule (alongside hideDeclinedEvents)
      const workingDaysConfig = esnCalendarModule?.configurations?.find(
        (config: ConfigurationItem) => config.name === 'workingDays'
      )
      state.workingDays =
        typeof workingDaysConfig?.value === 'boolean'
          ? workingDaysConfig.value
          : null
      const calendarModule = action.payload.configurations?.modules?.find(
        (module: ModuleConfiguration) => module.name === 'calendar'
      )
      if (calendarModule?.configurations) {
        const displayWeekNumbersConfig = calendarModule.configurations.find(
          (config: ConfigurationItem) => config.name === 'displayWeekNumbers'
        )
        if (displayWeekNumbersConfig) {
          state.displayWeekNumbers = displayWeekNumbersConfig.value === true
        }
      }
    })
  }
})

export const {
  setLanguage,
  setTimeZone,
  setView,
  setIsBrowserDefaultTimeZone,
  setHideDeclinedEvents,
  setDisplayWeekNumbers,
  setBusinessHours,
  setWorkingDays
} = SettingsSlice.actions
export default SettingsSlice.reducer
