import { WeekDaySelector } from '@common/components/Event/WeekDaySelector'
import {
  Box,
  FormControl,
  FormControlLabel,
  Switch,
  Typography
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { useWorkingDaysChange } from './hooks/useWorkingDaysChange'

interface WorkingDaysSettingsProps {
  inputMinWidth: string | number
  onWorkingDaysError: () => void
}

export const WorkingDaysSettings: React.FC<WorkingDaysSettingsProps> = ({
  inputMinWidth,
  onWorkingDaysError
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const { workingDays, businessHours, handleBusinessHour, handleWorkingDays } =
    useWorkingDaysChange(onWorkingDaysError)

  return (
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
  )
}
