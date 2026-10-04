import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import {
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'

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
  const inputSize = useResponsiveInputSize()

  return (
    <FieldWithLabel
      label={t('event.form.showMeAs')}
      isExpanded={showMore && !isMobile}
    >
      <FormControl fullWidth margin="dense" size={inputSize}>
        <Select
          SelectDisplayProps={{ 'aria-label': t('event.form.showMeAs') }}
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
