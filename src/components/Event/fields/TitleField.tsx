import React, { useRef } from 'react'
import { TextField } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from '../components/FieldWithLabel'
import { useAutoFocusTitle } from '../hooks/useAutoFocusTitle'

export interface TitleFieldProps {
  value: string
  onChange: (value: string) => void
  isMobile: boolean
  showMore: boolean
  isExpanded: boolean
  isOpen: boolean
  eventId?: string | null
}

export const TitleField: React.FC<TitleFieldProps> = ({
  value,
  onChange,
  isMobile,
  showMore,
  isExpanded,
  isOpen,
  eventId
}) => {
  const { t } = useI18n()
  const titleInputRef = useRef<HTMLInputElement>(null)

  useAutoFocusTitle({ isOpen, eventId, titleInputRef, showMore })

  return (
    <FieldWithLabel
      label={showMore ? t('event.form.title') : ''}
      isExpanded={isExpanded}
    >
      <TextField
        fullWidth
        autoComplete="off"
        label=""
        inputProps={{ 'aria-label': t('event.form.title') }}
        placeholder={t('event.form.titlePlaceholder')}
        value={value}
        onChange={e => onChange(e.target.value)}
        size={isMobile ? 'medium' : 'small'}
        margin="dense"
        inputRef={titleInputRef}
      />
    </FieldWithLabel>
  )
}
