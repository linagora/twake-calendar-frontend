import {
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from '../components/FieldWithLabel'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'

export interface FreeBusyFieldProps {
  busy: string
  setBusy: (value: string) => void
  /** Only rendered in expanded (showMore) mode */
  showMore: boolean
}

export const FreeBusyField: React.FC<FreeBusyFieldProps> = ({
  busy,
  setBusy,
  showMore
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  if (!showMore) return null

  return (
    <FieldWithLabel label={t('event.form.showMeAs')} isExpanded={!isMobile}>
      <FormControl fullWidth margin="dense" size="small">
        <Select
          labelId="busy"
          value={busy}
          onChange={(e: SelectChangeEvent) => setBusy(e.target.value)}
        >
          <MenuItem value="TRANSPARENT">{t('event.form.free')}</MenuItem>
          <MenuItem value="OPAQUE">{t('event.form.busy')}</MenuItem>
        </Select>
      </FormControl>
    </FieldWithLabel>
  )
}
