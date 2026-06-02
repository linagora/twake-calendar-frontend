import {
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from '../components/FieldWithLabel'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { translateDuration } from '@/features/Events/EventPreview/utils/parseDuration'

const PREDEFINED_VALUES = [
  '',
  '-PT1M',
  '-PT5M',
  '-PT10M',
  '-PT15M',
  '-PT30M',
  '-PT1H',
  '-PT2H',
  '-PT5H',
  '-PT12H',
  '-PT1D',
  '-PT2D',
  '-PT1W'
]

export interface NotificationFieldProps {
  alarm: string
  setAlarm: (value: string) => void
  /** Only rendered in expanded (showMore) mode */
  showMore: boolean
}

export const NotificationField: React.FC<NotificationFieldProps> = ({
  alarm,
  setAlarm,
  showMore
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const isCustomAlarm = alarm && !PREDEFINED_VALUES.includes(alarm)

  return (
    <FieldWithLabel
      label={t('event.form.notification')}
      isExpanded={showMore && !isMobile}
    >
      <FormControl fullWidth margin="dense" size="small">
        <Select
          labelId="notification"
          value={alarm}
          displayEmpty
          onChange={(e: SelectChangeEvent) => setAlarm(e.target.value)}
        >
          <MenuItem value="">{t('event.form.notifications.')}</MenuItem>
          {isCustomAlarm && (
            <MenuItem value={alarm}>{translateDuration(alarm, t)}</MenuItem>
          )}
          {PREDEFINED_VALUES.filter(value => !!value).map(value => (
            <MenuItem key={value} value={value}>
              {translateDuration(value, t)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </FieldWithLabel>
  )
}
