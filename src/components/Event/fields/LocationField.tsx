import { TextField } from '@linagora/twake-mui'
import { LocationOn as LocationIcon } from '@mui/icons-material'
import { useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { useEventLocation } from '../hooks/useEventLocation'
import { FieldWithLabel } from '../components/FieldWithLabel'
import { SectionPreviewRow } from '../components/SectionPreviewRow'

interface LocationFieldProps {
  location: string
  setLocation: (v: string) => void
  showMore: boolean
  isOpen?: boolean
}

const showInputLabel = (showMore: boolean, label: string): string => {
  if (showMore) {
    return label
  }
  return ''
}

export default function LocationField({
  location,
  setLocation,
  showMore,
  isOpen = false
}: LocationFieldProps): JSX.Element {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const [hasClickedLocationSection, setHasClickedLocationSection] =
    useState(false)

  const locationInputRef = useRef<HTMLInputElement>(null)

  useEventLocation({
    isOpen,
    hasClickedLocationSection,
    setHasClickedLocationSection,
    locationInputRef
  })

  const isLocationExpanded = showMore || hasClickedLocationSection

  return (
    <FieldWithLabel
      label={showInputLabel(isLocationExpanded, t('event.form.location'))}
      isExpanded={showMore && !isMobile}
    >
      {!isLocationExpanded ? (
        <SectionPreviewRow
          icon={<LocationIcon />}
          onClick={() => setHasClickedLocationSection(true)}
        >
          {location || t('event.form.locationPlaceholder')}
        </SectionPreviewRow>
      ) : (
        <TextField
          autoComplete="off"
          fullWidth
          label=""
          inputRef={locationInputRef}
          inputProps={{ 'aria-label': t('event.form.location') }}
          placeholder={t('event.form.locationPlaceholder')}
          value={location}
          onChange={e => setLocation(e.target.value)}
          size={isMobile ? 'medium' : 'small'}
          margin="dense"
        />
      )}
    </FieldWithLabel>
  )
}
