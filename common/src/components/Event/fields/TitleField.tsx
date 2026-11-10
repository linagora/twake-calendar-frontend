import React, { useRef } from 'react'
import { Box, TextField } from '@linagora/twake-mui'
import { FILE_DROP_START_AFTER } from '@common/components/Dialog/DialogFileDrop'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { useAutoFocusTitle } from '@common/components/Event/hooks/useAutoFocusTitle'
import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'

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
  const inputSize = useResponsiveInputSize()
  const titleInputRef = useRef<HTMLInputElement>(null)

  useAutoFocusTitle({ isOpen, eventId, titleInputRef, showMore })

  // Files dropped on the dialog land under the title
  return (
    <Box {...FILE_DROP_START_AFTER}>
      <FieldWithLabel
        label={showMore ? t('event.form.title') : ''}
        isExpanded={isExpanded}
      >
        <TextField
          fullWidth
          autoComplete="off"
          label=""
          slotProps={{
            input: { 'aria-label': t('event.form.title') },
            htmlInput: { 'data-event-title': 'true' }
          }}
          placeholder={t('event.form.titlePlaceholder')}
          value={value}
          onChange={e => onChange(e.target.value)}
          size={inputSize}
          margin="dense"
          inputRef={titleInputRef}
        />
      </FieldWithLabel>
    </Box>
  )
}
