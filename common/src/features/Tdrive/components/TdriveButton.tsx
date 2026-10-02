import React from 'react'
import { SectionPreviewRow } from '@common/components/Event/components/SectionPreviewRow'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { AttachmentField } from '@common/components/Event/fields/AttachmentField'
import { Box, Button, Snackbar, Alert } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { useTdrivePicker } from '../hooks/useTdrivePicker'
import { TdriveFile } from '../types'
import { TdrivePickerDialog } from './TdrivePickerDialog'
import { Icon, Drive } from '@linagora/twake-icons'
import { Attachment } from '@common/types/Attachment'
import { useMessageDuration } from '@common/components/Loading/useMessageDuration'

interface TdriveButtonProps {
  onFilesSelected: (file: TdriveFile[]) => void
  showMore: boolean
  attachments: Attachment[]
  setAttachments: (attachments: Attachment[]) => void
}

const TdriveIcon: React.FC = () => (
  <Box
    sx={{
      width: '18px',
      height: '18px'
    }}
  >
    <Icon icon={<Drive />} size={18} />
  </Box>
)

const TdriveButtonInShortMode: React.FC<{
  onClick: () => void
}> = ({ onClick }) => {
  const { t } = useI18n()
  return (
    <SectionPreviewRow icon={<TdriveIcon />} onClick={onClick}>
      {t('event.form.addTdriveFile')}
    </SectionPreviewRow>
  )
}

const TdriveButtonInExpandedMode: React.FC<{
  onClick: () => void
}> = ({ onClick }) => {
  const { t } = useI18n()
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Button
        startIcon={<TdriveIcon />}
        onClick={onClick}
        size="medium"
        variant="contained"
        color="secondary"
        sx={{ borderRadius: '4px' }}
      >
        {t('event.form.addTdriveFile')}
      </Button>
    </Box>
  )
}

export const TdriveButton: React.FC<TdriveButtonProps> = ({
  onFilesSelected,
  showMore,
  attachments,
  setAttachments
}) => {
  const { t } = useI18n()
  const errorDuration = useMessageDuration(4000, 'error')
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const {
    isOpen,
    containerRef,
    openPickerError,
    openPicker,
    closePicker,
    onReadyToUse
  } = useTdrivePicker({ onFilesSelected })

  const isExpanded = showMore && !isMobile

  return (
    <>
      <FieldWithLabel
        label={showMore ? t('event.form.tdriveFiles') : ''}
        isExpanded={isExpanded}
      >
        {!showMore ? (
          <TdriveButtonInShortMode onClick={() => void openPicker()} />
        ) : (
          <TdriveButtonInExpandedMode onClick={() => void openPicker()} />
        )}
        <Box sx={{ pt: 1 }}>
          <AttachmentField
            attachments={attachments}
            setAttachments={setAttachments}
          />
        </Box>
      </FieldWithLabel>

      <TdrivePickerDialog
        open={isOpen}
        onClose={closePicker}
        containerRef={containerRef}
        onReadyToUse={onReadyToUse}
      />

      <Snackbar
        open={openPickerError !== null}
        autoHideDuration={errorDuration}
        onClose={closePicker}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={closePicker}>
          {t('event.form.tdrivePickerError')}
        </Alert>
      </Snackbar>
    </>
  )
}
