import React from 'react'
import { TextField } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'

interface TitleFieldProps {
  titleLabel: string
  showExpandedLabel: boolean
  name: string
  setName: (value: string) => void
  nameInputRef: React.RefObject<HTMLInputElement>
}

export const TitleField: React.FC<TitleFieldProps> = ({
  titleLabel,
  showExpandedLabel,
  name,
  setName,
  nameInputRef
}) => {
  const { t } = useI18n()
  const inputSize = useResponsiveInputSize()

  return (
    <FieldWithLabel label={titleLabel} isExpanded={showExpandedLabel}>
      <TextField
        sx={{ pt: 1 }}
        size={inputSize}
        margin="dense"
        placeholder={t('booking.scheduleName')}
        type="text"
        fullWidth
        value={name}
        onChange={e => setName(e.target.value)}
        inputRef={nameInputRef}
        slotProps={{ htmlInput: { 'aria-label': t('booking.title') } }}
      />
    </FieldWithLabel>
  )
}
