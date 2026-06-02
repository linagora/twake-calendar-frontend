import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { WeekDaySelector } from '@common/components/Event/WeekDaySelector'
import {
  Box,
  FormControl,
  FormControlLabel,
  Switch,
  Typography
} from '@linagora/twake-mui'
import { useRef, useCallback, useEffect } from 'react'
import { useI18n } from 'twake-i18n'
import { updateUserConfigurations } from '@common/features/User/UserSlice'
import {
  BusinessHour,
  setBusinessHours,
  setDisplayWeekNumbers,
  setHideDeclinedEvents,
  setWorkingDays
} from './SettingsSlice'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { LanguageSelector } from './LanguageSelector'
import { TimezoneSelector } from './TimezoneSelector'

interface GeneralSettingsProps {
  onLanguageError: () => void
  onTimeZoneError: () => void
  onHideDeclinedEventsError: () => void
  onDisplayWeekNumbersError: () => void
  onWorkingDaysError: () => void
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  onLanguageError,
  onTimeZoneError,
  onHideDeclinedEventsError,
  onDisplayWeekNumbersError,
  onWorkingDaysError
}) => {
  const dispatch = useAppDispatch()
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const hideDeclinedEvents = useAppSelector(
    state => state.settings?.hideDeclinedEvents
  )
  const displayWeekNumbers = useAppSelector(
    state => state.settings?.displayWeekNumbers
  )
  const workingDays = useAppSelector(state => state.settings.workingDays)
  const businessHours = useAppSelector(state => state.settings.businessHours)
  const pendingBusinessHoursRef = useRef<BusinessHour | null>(null)
  const businessHoursTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const handleHideDeclinedEvents = (value: boolean): void => {
    dispatch(setHideDeclinedEvents(value))
    dispatch(updateUserConfigurations({ hideDeclinedEvents: value }))
      .unwrap()
      .catch(() => {
        dispatch(setHideDeclinedEvents(!value))
        onHideDeclinedEventsError()
      })
  }

  const handleDisplayWeekNumbers = (value: boolean): void => {
    dispatch(setDisplayWeekNumbers(value))
    dispatch(updateUserConfigurations({ displayWeekNumbers: value }))
      .unwrap()
      .catch(() => {
        dispatch(setDisplayWeekNumbers(!value))
        onDisplayWeekNumbersError()
      })
  }

  const handleBusinessHour = useCallback(
    ({ days }: { days: number[] }) => {
      const previousHours = businessHours
      const value: BusinessHour | null = businessHours
        ? { ...businessHours, daysOfWeek: days }
        : null

      dispatch(setBusinessHours(value))
      pendingBusinessHoursRef.current = value

      if (businessHoursTimeoutRef.current) {
        clearTimeout(businessHoursTimeoutRef.current)
      }

      businessHoursTimeoutRef.current = setTimeout(() => {
        dispatch(
          updateUserConfigurations({
            businessHours: pendingBusinessHoursRef.current
          })
        )
          .unwrap()
          .catch(() => {
            dispatch(setBusinessHours(previousHours))
            onWorkingDaysError()
          })
      }, 500)
    },
    [businessHours, dispatch, onWorkingDaysError]
  )

  useEffect(() => {
    return (): void => {
      if (businessHoursTimeoutRef.current) {
        clearTimeout(businessHoursTimeoutRef.current)
      }
    }
  }, [])

  const handleWorkingDays = (value: boolean): void => {
    dispatch(setWorkingDays(value))
    dispatch(updateUserConfigurations({ workingDays: value }))
      .unwrap()
      .catch(() => {
        dispatch(setWorkingDays(!value))
        onWorkingDaysError()
      })
  }

  const inputMinWidth = isMobile ? '100%' : 500

  return (
    <Box className="settings-tab-content">
      {/* Language */}
      <LanguageSelector onLanguageError={onLanguageError} />

      {/* Timezone */}
      <TimezoneSelector onTimeZoneError={onTimeZoneError} />

      {/* Working  */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t('settings.chooseWorkingDays')}
        </Typography>
        <WeekDaySelector
          selectedDays={businessHours?.daysOfWeek ?? []}
          onChange={days => handleBusinessHour({ days })}
        />
        <FormControl size="small" sx={{ minWidth: inputMinWidth, mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(workingDays)}
                onChange={() => handleWorkingDays(!workingDays)}
              />
            }
            label={t('settings.showOnlyWorkingDays')}
            labelPlacement="start"
            sx={{
              minWidth: isMobile ? '100%' : 400,
              justifyContent: 'space-between',
              marginLeft: 0
            }}
          />
        </FormControl>
      </Box>

      {/* Calendar & Events */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t('settings.calAndEvent')}
        </Typography>
        <FormControl size="small" sx={{ minWidth: inputMinWidth }}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(!hideDeclinedEvents)}
                onChange={() => handleHideDeclinedEvents(!hideDeclinedEvents)}
                aria-label={t('settings.showDeclinedEvent')}
              />
            }
            label={t('settings.showDeclinedEvent')}
            labelPlacement="start"
            sx={{
              minWidth: isMobile ? '100%' : 400,
              justifyContent: 'space-between',
              marginLeft: 0
            }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(displayWeekNumbers)}
                onChange={() => handleDisplayWeekNumbers(!displayWeekNumbers)}
                aria-label={t('settings.displayWeekNumbers')}
              />
            }
            label={t('settings.displayWeekNumbers')}
            labelPlacement="start"
            sx={{
              minWidth: isMobile ? '100%' : 400,
              justifyContent: 'space-between',
              marginLeft: 0
            }}
          />
        </FormControl>
      </Box>
    </Box>
  )
}
