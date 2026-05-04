import {
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from '../components/FieldWithLabel'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'

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

  if (!showMore) return null

  return (
    <FieldWithLabel label={t('event.form.notification')} isExpanded={!isMobile}>
      <FormControl fullWidth margin="dense" size="small">
        <Select
          labelId="notification"
          value={alarm}
          displayEmpty
          onChange={(e: SelectChangeEvent) => setAlarm(e.target.value)}
        >
          <MenuItem value="">{t('event.form.notifications.')}</MenuItem>
          <MenuItem value="-PT1M">
            {t('event.form.notifications.-PT1M')}
          </MenuItem>
          <MenuItem value="-PT5M">
            {t('event.form.notifications.-PT5M')}
          </MenuItem>
          <MenuItem value="-PT10M">
            {t('event.form.notifications.-PT10M')}
          </MenuItem>
          <MenuItem value="-PT15M">
            {t('event.form.notifications.-PT15M')}
          </MenuItem>
          <MenuItem value="-PT30M">
            {t('event.form.notifications.-PT30M')}
          </MenuItem>
          <MenuItem value="-PT1H">
            {t('event.form.notifications.-PT1H')}
          </MenuItem>
          <MenuItem value="-PT2H">
            {t('event.form.notifications.-PT2H')}
          </MenuItem>
          <MenuItem value="-PT5H">
            {t('event.form.notifications.-PT5H')}
          </MenuItem>
          <MenuItem value="-PT12H">
            {t('event.form.notifications.-PT12H')}
          </MenuItem>
          <MenuItem value="-PT1D">
            {t('event.form.notifications.-PT1D')}
          </MenuItem>
          <MenuItem value="-PT2D">
            {t('event.form.notifications.-PT2D')}
          </MenuItem>
          <MenuItem value="-PT1W">
            {t('event.form.notifications.-PT1W')}
          </MenuItem>
        </Select>
      </FormControl>
    </FieldWithLabel>
  )
}
