import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Dialog,
  Box,
  IconButton,
  Typography,
  CircularProgress
} from '@linagora/twake-mui'
import { Close as CloseIcon } from '@mui/icons-material'
import { useI18n } from 'twake-i18n'
import { TdriveFile } from '../hooks/useTdrivePicker'
import {
  getMessageType,
  isReadyMessage,
  extractIntentId,
  buildReadyResponse,
  parseFileSelection
} from './TdrivePickerMessageUtils'

const HANDSHAKE_TIMEOUT_MS = 30_000

interface TdrivePickerDialogProps {
  open: boolean
  iframeUrl: string | null
  onClose: () => void
  onFileSelected: (file: TdriveFile) => void
}

type IframeState = 'loading' | 'ready' | 'error'

interface PickerContentProps {
  iframeUrl: string
  onFileSelected: (file: TdriveFile) => void
}

const PickerContent: React.FC<PickerContentProps> = ({
  iframeUrl,
  onFileSelected
}) => {
  const { t } = useI18n()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeState, setIframeState] = useState<IframeState>('loading')

  const handleMessage = useCallback(
    (event: MessageEvent): void => {
      const iframeOrigin = new URL(iframeUrl).origin
      if (event.origin !== iframeOrigin) return

      const typeStr = getMessageType(event.data)

      if (typeStr !== undefined && isReadyMessage(typeStr)) {
        const intentId = extractIntentId(typeStr)
        iframeRef.current?.contentWindow?.postMessage(
          buildReadyResponse(intentId),
          iframeOrigin
        )
        setIframeState('ready')
        return
      }

      if (typeStr !== undefined && typeStr.endsWith(':error')) {
        setIframeState('error')
        return
      }

      const file = parseFileSelection(event.data)
      if (file) {
        onFileSelected(file)
      }
    },
    [iframeUrl, onFileSelected]
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIframeState(prev => (prev === 'loading' ? 'error' : prev))
    }, HANDSHAKE_TIMEOUT_MS)

    window.addEventListener('message', handleMessage)

    return (): void => {
      clearTimeout(timeoutId)
      window.removeEventListener('message', handleMessage)
    }
  }, [handleMessage])

  const showLoader = iframeState !== 'ready'
  const showError = iframeState === 'error'

  return (
    <>
      {showLoader && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'background.paper',
            gap: 2,
            zIndex: 1
          }}
        >
          {showError ? (
            <Typography color="error">
              {t('event.form.tdriveLoadingError')}
            </Typography>
          ) : (
            <CircularProgress />
          )}
        </Box>
      )}
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          visibility: iframeState === 'ready' ? 'visible' : 'hidden'
        }}
        title="Tdrive file picker"
      />
    </>
  )
}

export const TdrivePickerDialog: React.FC<TdrivePickerDialogProps> = ({
  open,
  iframeUrl,
  onClose,
  onFileSelected
}) => {
  const { t } = useI18n()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          maxWidth: '900px',
          width: '100%',
          height: '80vh',
          maxHeight: '800px'
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Typography variant="h6">
          {t('event.form.tdrivePickerTitle')}
        </Typography>
        <IconButton onClick={onClose} aria-label={t('actions.close')}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {iframeUrl && (
          <PickerContent
            key={iframeUrl}
            iframeUrl={iframeUrl}
            onFileSelected={onFileSelected}
          />
        )}
      </Box>
    </Dialog>
  )
}
