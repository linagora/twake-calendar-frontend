import React from 'react'
import { SectionPreviewRow } from '@common/components/Event/components/SectionPreviewRow'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { Box, Button, Icon, Snackbar, Alert } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import FolderIcon from '@mui/icons-material/Folder'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { useTdrivePicker, TdriveFile } from '../hooks/useTdrivePicker'
import { TdrivePickerDialog } from './TdrivePickerDialog'

interface TdriveButtonProps {
  onFileSelected: (file: TdriveFile) => void
  showMore: boolean
}

const TdriveIcon: React.FC = () => (
  <Icon sx={{ color: '#4A90E2' }}>
    <FolderIcon />
  </Icon>
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
        sx={{
          borderRadius: '4px'
        }}
      >
        {t('event.form.addTdriveFile')}
      </Button>
    </Box>
  )
}

export const TdriveButton: React.FC<TdriveButtonProps> = ({
  onFileSelected,
  showMore
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const {
    isOpen,
    iframeUrl,
    openPickerError,
    openPicker,
    closePicker,
    handleFileSelected
  } = useTdrivePicker({ onFileSelected })

  const isExpanded = showMore && !isMobile

  return (
    <>
      <FieldWithLabel
        label={showMore ? t('event.form.tdriveFiles') : ''}
        isExpanded={isExpanded}
      >
        {!showMore ? (
          <TdriveButtonInShortMode onClick={openPicker} />
        ) : (
          <TdriveButtonInExpandedMode onClick={openPicker} />
        )}
      </FieldWithLabel>

      <TdrivePickerDialog
        open={isOpen}
        iframeUrl={iframeUrl}
        onClose={closePicker}
        onFileSelected={handleFileSelected}
      />
      <Snackbar
        open={openPickerError !== null}
        autoHideDuration={4000}
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
