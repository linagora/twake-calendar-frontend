import React from 'react'
import { Button, Box } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import AddIcon from '@mui/icons-material/Add'

export const ModalActions: React.FC<{
  isExpanded: boolean
  buttonSize: 'small' | 'medium' | 'large'
  onExpandToggle: () => void
  onSave: () => void
  onClose: () => void
  loading: boolean
  isFormValid: boolean
  saveButtonText: string
  isEdit?: boolean
}> = ({
  isExpanded,
  buttonSize,
  onExpandToggle,
  onClose,
  onSave,
  loading,
  isFormValid,
  saveButtonText,
  isEdit
}) => {
  const { t } = useI18n()

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%'
      }}
    >
      {!isExpanded && (
        <Button
          variant="text"
          size={buttonSize}
          startIcon={<AddIcon />}
          onClick={onExpandToggle}
        >
          {t('common.moreOptions')}
        </Button>
      )}
      <Box sx={{ display: 'flex', gap: 1, ml: isExpanded ? 'auto' : 0 }}>
        {(isExpanded || isEdit) && (
          <Button
            size={buttonSize}
            variant="outlined"
            color="secondary"
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
        )}
        <Button
          onClick={() => void onSave()}
          variant="contained"
          disabled={loading || !isFormValid}
        >
          {saveButtonText}
        </Button>
      </Box>
    </Box>
  )
}
