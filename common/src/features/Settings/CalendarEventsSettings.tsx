import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  Box,
  FormControl,
  FormControlLabel,
  Switch,
  Typography
} from '@linagora/twake-mui'
import { useRef } from 'react'
import { useI18n } from 'twake-i18n'
import { updateUserConfigurations } from '@common/features/User/UserSlice'
import { setDisplayWeekNumbers, setHideDeclinedEvents } from './SettingsSlice'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'

interface CalendarEventsSettingsProps {
  inputMinWidth: string | number
  onHideDeclinedEventsError: () => void
  onDisplayWeekNumbersError: () => void
}

export const CalendarEventsSettings: React.FC<CalendarEventsSettingsProps> = ({
  inputMinWidth,
  onHideDeclinedEventsError,
  onDisplayWeekNumbersError
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const dispatch = useAppDispatch()

  const hideDeclinedEvents = useAppSelector(
    state => state.settings?.hideDeclinedEvents
  )
  const displayWeekNumbers = useAppSelector(
    state => state.settings?.displayWeekNumbers
  )

  const latestHideDeclinedEventsRef = useRef<boolean | undefined>(undefined)
  const latestDisplayWeekNumbersRef = useRef<boolean | undefined>(undefined)

  const handleHideDeclinedEvents = (value: boolean): void => {
    latestHideDeclinedEventsRef.current = value
    dispatch(setHideDeclinedEvents(value))
    dispatch(updateUserConfigurations({ hideDeclinedEvents: value }))
      .unwrap()
      .catch(() => {
        if (latestHideDeclinedEventsRef.current === value) {
          dispatch(setHideDeclinedEvents(!value))
        }
        onHideDeclinedEventsError()
      })
  }

  const handleDisplayWeekNumbers = (value: boolean): void => {
    latestDisplayWeekNumbersRef.current = value
    dispatch(setDisplayWeekNumbers(value))
    dispatch(updateUserConfigurations({ displayWeekNumbers: value }))
      .unwrap()
      .catch(() => {
        if (latestDisplayWeekNumbersRef.current === value) {
          dispatch(setDisplayWeekNumbers(!value))
        }
        onDisplayWeekNumbersError()
      })
  }

  return (
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
  )
}
