import React from 'react'
import { ToggleButton, ToggleButtonGroup } from '@linagora/twake-mui'
import { Public as PublicIcon } from '@mui/icons-material'
import LockOutlineIcon from '@mui/icons-material/LockOutline'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from '../components/FieldWithLabel'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'

export interface VisibilityFieldProps {
  eventClass: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'
  setEventClass: (value: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL') => void
  /** Only rendered in expanded (showMore) mode */
  showMore: boolean
}

export const VisibilityField: React.FC<VisibilityFieldProps> = ({
  eventClass,
  setEventClass,
  showMore
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  if (!showMore) return null

  return (
    <FieldWithLabel label={t('event.form.visibleTo')} isExpanded={!isMobile}>
      <ToggleButtonGroup
        value={eventClass}
        exclusive
        onChange={(_e, newValue: string | null) => {
          if (newValue !== null) {
            setEventClass(newValue as 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL')
          }
        }}
        size="medium"
      >
        <ToggleButton value="PUBLIC" sx={{ minWidth: '160px' }}>
          <PublicIcon sx={{ mr: 1 }} />
          {t('event.form.visibleAll')}
        </ToggleButton>
        <ToggleButton value="PRIVATE" sx={{ minWidth: '160px' }}>
          <LockOutlineIcon sx={{ mr: 1 }} />
          {t('event.form.visibleParticipants')}
        </ToggleButton>
      </ToggleButtonGroup>
    </FieldWithLabel>
  )
}
