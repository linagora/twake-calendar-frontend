import { createAppSlice } from '@common/app/createAppSlice'
import {
  ConfigurationItem,
  ModuleConfiguration
} from '@common/features/User/userDataTypes'
import { getOpenPaasUserData } from '@common/features/User/UserSlice'
import { browserDefaultTimeZone, isValidTimeZone } from '@common/utils/timezone'
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
// If savedTimeZone is the string "null", doesn't exist or is unknown to the
// browser (an earlier load may have saved it from the backend), use null
const defaultTimeZone = isValidTimeZone(savedTimeZone) ? savedTimeZone : null

const AUTO_DETECT_TIME_ZONE_KEY = 'autoDetectTimeZone'

// Automatic detection is the default. The backend answers with a deployment
// wide fallback timezone for users who never configured one, so its answer
// cannot tell a deliberate choice apart from that fallback: only an explicit
// opt out, remembered here, turns the detection off.
const autoDetectTimeZone =
  localStorage.getItem(AUTO_DETECT_TIME_ZONE_KEY) !== 'false'

function rememberAutoDetectTimeZone(enabled: boolean): void {
  localStorage.setItem(AUTO_DETECT_TIME_ZONE_KEY, String(enabled))
}

interface DatetimeConfiguration {
  timeZone?: string | null
  autoDetect?: boolean
}

// The backend tells whether the user opted out of the automatic detection, and
// is then the one to be believed: the opt out follows the user across
// browsers, whether or not a zone comes attached to it. Deployments that
// predate the flag answer without it, and there only a stored zone can carry
// the opt out this browser remembers.
const isOptedOut = (
  datetime: DatetimeConfiguration | undefined,
  isOptedOutLocally: boolean
): boolean =>
  typeof datetime?.autoDetect === 'boolean'
    ? !datetime.autoDetect
    : isOptedOutLocally && Boolean(datetime?.timeZone)

// A timezone coming back only wins over the browser one when the user opted
// out of the automatic detection: otherwise it may well be the deployment wide
// fallback the backend serves to unconfigured users, or the very zone a
// browser of theirs detected. An opt out reaching us without a zone pins the
// one the calendar already runs on rather than that fallback.
const optedOutTimeZone = (
  datetime: DatetimeConfiguration | undefined,
  timeZoneInUse: string | null
): string => datetime?.timeZone ?? timeZoneInUse ?? browserDefaultTimeZone

// An unknown zone crashes every date formatting: drop it, as if the backend
// had sent none, so the calendar and its settings stay reachable.
const withKnownTimeZone = (
  datetime: DatetimeConfiguration | undefined
): DatetimeConfiguration | undefined =>
  datetime && !isValidTimeZone(datetime.timeZone)
    ? { ...datetime, timeZone: null }
    : datetime

const applyServerTimeZone = (
  state: SettingsState,
  serverDatetime: DatetimeConfiguration | undefined
): void => {
  const datetime = withKnownTimeZone(serverDatetime)
  if (isOptedOut(datetime, !state.isBrowserDefaultTimeZone)) {
    state.timeZone = optedOutTimeZone(datetime, state.timeZone)
    state.isBrowserDefaultTimeZone = false
    rememberAutoDetectTimeZone(false)
  } else {
    state.timeZone = browserDefaultTimeZone
    state.isBrowserDefaultTimeZone = true
    rememberAutoDetectTimeZone(true)
  }
  localStorage.setItem('timeZone', state.timeZone)
}

const initialState: SettingsState = {
  language: defaultLang,
  timeZone: autoDetectTimeZone ? browserDefaultTimeZone : defaultTimeZone,
  isBrowserDefaultTimeZone: autoDetectTimeZone,
  timeZonePickedDuringUserDataFetch: false,
  hideDeclinedEvents: null,
  displayWeekNumbers: true,
  view: 'calendar',
  businessHours: null,
  workingDays: null
}

const SettingsSlice = createAppSlice({
  name: 'settings',
  initialState,
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
        rememberAutoDetectTimeZone(action.payload)
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
        | DatetimeConfiguration
        | undefined

      // a zone the user picked while this fetch was in flight must not be
      // clobbered by the (now stale) server value
      if (!state.timeZonePickedDuringUserDataFetch) {
        applyServerTimeZone(state, datetimeValue)
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
