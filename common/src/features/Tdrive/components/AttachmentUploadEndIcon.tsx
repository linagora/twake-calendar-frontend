import React from 'react'
import { CheckCircle, AddToCloud, Icon } from '@linagora/twake-icons'
import { Box, CircularProgress, IconButton, Tooltip } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

export const AttachmentUploadEndIcon: React.FC<{
  status: 'idle' | 'saving' | 'success' | 'error'
  onSave: () => Promise<void>
}> = ({ status, onSave }) => {
  const { t } = useI18n()
  if (status === 'success') {
    return (
      <Tooltip title={t('tdrive.saved')}>
        <Box
          component="span"
          role="status"
          aria-label={t('tdrive.saved')}
          onClick={event => event.stopPropagation()}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            p: '5px',
            color: 'success.main'
          }}
        >
          <Icon icon={CheckCircle} size={18} />
        </Box>
      </Tooltip>
    )
  }
  return (
    <Tooltip
      title={t(status === 'saving' ? 'tdrive.saving' : 'tdrive.saveToDrive')}
    >
      <span onClick={event => event.stopPropagation()}>
        <IconButton
          size="xsmall"
          aria-label={t('tdrive.saveToDrive')}
          loading={status === 'saving'}
          loadingIndicator={
            <CircularProgress
              size={18}
              color="primary"
              aria-label={t('tdrive.saving')}
            />
          }
          onClick={event => {
            event.preventDefault()
            event.stopPropagation()
            void onSave()
          }}
        >
          <Icon icon={AddToCloud} size={16} />
        </IconButton>
      </span>
    </Tooltip>
  )
}
