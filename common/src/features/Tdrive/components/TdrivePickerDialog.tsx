import React, { useState, useCallback, useEffect } from 'react'
import { Dialog, Box, IconButton } from '@linagora/twake-mui'
import { Close as CloseIcon } from '@mui/icons-material'
import { TdriveFile } from '../types'
import { PickerSkeleton } from './PickerSkeleton'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { useI18n } from 'twake-i18n'

interface TdrivePickerDialogProps {
  open: boolean
  onClose: () => void
  containerRef: React.RefObject<HTMLDivElement>
  onReadyToUse: (callback: () => void) => void
  onFileSelected: (file: TdriveFile) => void
}

interface PickerContentProps {
  isReady: boolean
  containerRef: React.RefObject<HTMLDivElement>
}

const PickerContent: React.FC<PickerContentProps> = ({
  isReady,
  containerRef
}) => {
  return (
    <>
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {!isReady && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              width: '100%'
            }}
          >
            <PickerSkeleton />
          </Box>
        )}
        <Box
          ref={containerRef}
          sx={{
            position: 'absolute',
            inset: 0,
            '& > iframe': {
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#fff'
            }
          }}
        />
      </Box>
    </>
  )
}

export const TdrivePickerDialog: React.FC<TdrivePickerDialogProps> = ({
  open,
  onClose,
  containerRef,
  onReadyToUse
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const [isReady, setIsReady] = useState(false)

  // cozy-interapp creates the picker iframe without a title
  useEffect(() => {
    if (!isReady) return
    containerRef.current
      ?.querySelector('iframe')
      ?.setAttribute('title', t('event.form.tdrivePickerTitle'))
  }, [isReady, containerRef, t])

  // Reset loader each time the dialog opens
  const handleTransitionEnter = useCallback(() => {
    setIsReady(false)
    onReadyToUse(() => setIsReady(true))
  }, [onReadyToUse])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      fullScreen={isMobile}
      onTransitionEnter={handleTransitionEnter}
      slotProps={{
        paper: { 'aria-label': t('event.form.tdrivePickerTitle') }
      }}
      sx={{
        '& .MuiDialog-paper': {
          maxWidth: '900px',
          width: '100%',
          height: isMobile ? '100vh' : '80vh',
          maxHeight: isMobile ? undefined : '800px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }
      }}
    >
      <PickerContent containerRef={containerRef} isReady={isReady} />
      {!isReady && (
        <IconButton
          aria-label={t('actions.close')}
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            zIndex: 1
          }}
        >
          <CloseIcon />
        </IconButton>
      )}
    </Dialog>
  )
}
