import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { useTimeZoneList } from '@common/components/Timezone/hooks/useTimeZoneList'
import { TimezoneAutocomplete } from '@common/components/Timezone/TimezoneAutocomplete'
import {
  browserDefaultTimeZone,
  getTimezoneOffset
} from '@common/utils/timezone'
import {
  Box,
  FormControl,
  FormControlLabel,
  Switch,
  Typography
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import {
  setTimezone as setUserTimeZone,
  updateUserConfigurations
} from '@common/features/User/UserSlice'
import {
  setIsBrowserDefaultTimeZone,
  setTimeZone as setSettingsTimeZone
} from '@common/features/Settings/SettingsSlice'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { MobileTimezoneSelector } from './MobileTimezoneSelector'

interface TimezoneSelectorProps {
  onTimeZoneError: () => void
}

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  onTimeZoneError
}) => {
  const dispatch = useAppDispatch()
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const previousConfig = useAppSelector(state => state.user.coreConfig)

  const timezoneList = useTimeZoneList()
  const userTimeZone = useAppSelector(
    state => state.user?.coreConfig?.datetime?.timeZone
  )
  const settingTimeZone = useAppSelector(state => state.settings?.timeZone)
  const currentTimeZone =
    userTimeZone ?? settingTimeZone ?? browserDefaultTimeZone
  const isBrowserDefault = useAppSelector(
    state => state.settings.isBrowserDefaultTimeZone
  )

  const handleTimeZoneChange = (newTimeZone: string): void => {
    const previousTimeZone = currentTimeZone
    dispatch(setUserTimeZone(newTimeZone))
    dispatch(setSettingsTimeZone(newTimeZone))
    // No `autoDetectTimezone` here: picking a zone by hand is only offered
    // once the detection was turned off, which is what wrote the flag down.
    dispatch(
      updateUserConfigurations({ timezone: newTimeZone, previousConfig })
    )
      .unwrap()
      .catch(() => {
        dispatch(setUserTimeZone(previousTimeZone))
        dispatch(setSettingsTimeZone(previousTimeZone))
        onTimeZoneError()
      })
  }

  const handleTimeZoneDefaultChange = (isDefault: boolean): void => {
    const previousUserTimeZone = userTimeZone ?? null
    const previousSettingTimeZone = settingTimeZone ?? browserDefaultTimeZone
    // The backend holds a concrete zone at all times -- it renders invitation
    // mails with it and has no browser of its own to detect one -- so the
    // detection hands it the detected zone, and turning the detection off
    // pins down the zone the calendar already runs on rather than the
    // fallback served to users who configured none. The `autoDetect` flag,
    // not the zone, is what tells the two apart from now on.
    const timeZone = isDefault
      ? browserDefaultTimeZone
      : previousSettingTimeZone

    dispatch(setIsBrowserDefaultTimeZone(isDefault))
    dispatch(setUserTimeZone(timeZone))
    dispatch(setSettingsTimeZone(timeZone))
    dispatch(
      updateUserConfigurations({
        timezone: timeZone,
        autoDetectTimezone: isDefault,
        previousConfig
      })
    )
      .unwrap()
      .catch(() => {
        dispatch(setUserTimeZone(previousUserTimeZone))
        dispatch(setSettingsTimeZone(previousSettingTimeZone))
        dispatch(setIsBrowserDefaultTimeZone(!isDefault))
        onTimeZoneError()
      })
  }

  const inputMinWidth = isMobile ? '100%' : 500

  return (
    <Box
      sx={{
        mb: 4
      }}
    >
      <Typography component="h2" variant="h6" sx={{ mb: 1 }}>
        {t('settings.timeZone')}
      </Typography>
      <Box>
        <FormControl size="small" sx={{ minWidth: inputMinWidth }}>
          <FormControlLabel
            control={
              <Switch
                checked={isBrowserDefault}
                onChange={() => handleTimeZoneDefaultChange(!isBrowserDefault)}
                aria-label={t('settings.timeZoneBrowserDefault')}
              />
            }
            label={t('settings.timeZoneBrowserDefault')}
            labelPlacement="start"
            sx={{
              minWidth: isMobile ? '100%' : 400,
              justifyContent: 'space-between',
              marginLeft: 0,
              mb: 2
            }}
          />
          {!isMobile && !isBrowserDefault && (
            <TimezoneAutocomplete
              value={currentTimeZone}
              zones={timezoneList.zones}
              getTimezoneOffset={getTimezoneOffset}
              onChange={handleTimeZoneChange}
            />
          )}
        </FormControl>
      </Box>
      {isMobile && !isBrowserDefault && (
        <MobileTimezoneSelector
          currentTimezone={currentTimeZone}
          onChange={handleTimeZoneChange}
        />
      )}
    </Box>
  )
}
