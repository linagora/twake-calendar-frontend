import React, { useRef } from 'react'
import { TextField } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { useAutoFocusTitle } from '@common/components/Event/hooks/useAutoFocusTitle'
import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'
import { useHighContrast } from '@common/features/Settings/Accessibility/highContrastMode'

export interface TitleFieldProps {
  value: string
  onChange: (value: string) => void
  showMore: boolean
  isExpanded: boolean
  isOpen: boolean
  eventId?: string | null
}

export const TitleField: React.FC<TitleFieldProps> = ({
  value,
  onChange,
  showMore,
  isExpanded,
  isOpen,
  eventId
}) => {
  const { t } = useI18n()
  // R-14, high contrast mode: the title keeps its visible label in the
  // compact form too, not only its placeholder
  const highContrast = useHighContrast()
  const inputSize = useResponsiveInputSize()
  const titleInputRef = useRef<HTMLInputElement>(null)

  useAutoFocusTitle({ isOpen, eventId, titleInputRef, showMore })

  return (
    <FieldWithLabel
      label={showMore || highContrast ? t('event.form.title') : ''}
      isExpanded={isExpanded}
    >
      <TextField
        fullWidth
        autoComplete="off"
        label=""
        slotProps={{ htmlInput: { 'aria-label': t('event.form.title') } }}
        placeholder={t('event.form.titlePlaceholder')}
        value={value}
        onChange={e => onChange(e.target.value)}
        size={inputSize}
        margin="dense"
        inputRef={titleInputRef}
      />
    </FieldWithLabel>
  )
}
