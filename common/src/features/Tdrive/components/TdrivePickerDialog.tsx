import React, { useState, useCallback } from 'react'
import { Dialog, Box, IconButton, alpha, useTheme } from '@linagora/twake-mui'
import { Close as CloseIcon } from '@mui/icons-material'
import { TdriveFile } from '../types'
import { PickerSkeleton } from './PickerSkeleton'

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
  const theme = useTheme()
  const [isReady, setIsReady] = useState(false)

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
      onTransitionEnter={handleTransitionEnter}
      sx={{
        '& .MuiDialog-paper': {
          maxWidth: '900px',
          width: '100%',
          height: '80vh',
          maxHeight: '800px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }
      }}
    >
      <PickerContent containerRef={containerRef} isReady={isReady} />
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          color: alpha(theme.palette.grey[900], 0.9)
        }}
      >
        <CloseIcon />
      </IconButton>
    </Dialog>
  )
}
