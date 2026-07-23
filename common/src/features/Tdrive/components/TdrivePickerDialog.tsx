import React, { useEffect, useRef, useState } from 'react'
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

interface TdrivePickerDialogProps {
  open: boolean
  iframeUrl: string | null
  onClose: () => void
  onFileSelected: (file: TdriveFile) => void
}

export const TdrivePickerDialog: React.FC<TdrivePickerDialogProps> = ({
  open,
  iframeUrl,
  onClose,
  onFileSelected
}) => {
  const { t } = useI18n()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isIframeReady, setIsIframeReady] = useState(false)

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      if (!iframeUrl) return

      const iframeOrigin = new URL(iframeUrl).origin

      // Only accept messages from the Tdrive iframe origin
      if (event.origin !== iframeOrigin) {
        return
      }

      const data = event.data

      // Handle "ready" postMessage from Tdrive intent
      // Format: "intent-<id>:ready" or { type: "intent-<id>:ready" }
      const typeStr =
        typeof data === 'string'
          ? data
          : typeof data === 'object' && data !== null
            ? data.type
            : undefined

      const isReady = typeStr?.endsWith(':ready') ?? false

      if (isReady) {
        console.info('[Tdrive] Received ready, posting send message to iframe')

        // Send postMessage to iframe to send {} over its WebSocket
        // Use the same intent ID prefix for the response
        const intentId = typeStr?.split(':')[0] // "intent-xxx"
        iframeRef.current?.contentWindow?.postMessage(
          { type: `${intentId}:send`, payload: {} },
          iframeOrigin
        )

        // Show iframe content now that post is sent
        setIsIframeReady(true)

        return
      }

      // Handle file selection message from Tdrive intent
      if (data && typeof data === 'object' && data.type === 'intent-response') {
        const file = data.file
        if (file) {
          onFileSelected({
            id: file.id,
            name: file.name,
            url: file.url,
            type: file.action === 'sharingLink' ? 'sharingLink' : 'downloadLink'
          })
        }
      }
    }

    if (open) {
      window.addEventListener('message', handleMessage)
    }

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [open, iframeUrl, onFileSelected])

  // Reset ready state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsIframeReady(false)
    }
  }, [open])

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
        <IconButton onClick={onClose} aria-label={t('action.close')}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Loading indicator shown until iframe is ready */}
        {!isIframeReady && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'background.paper'
            }}
          >
            <CircularProgress />
          </Box>
        )}
        {iframeUrl && (
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              visibility: isIframeReady ? 'visible' : 'hidden'
            }}
            title={t('event.form.tdrivePickerTitle')}
          />
        )}
      </Box>
    </Dialog>
  )
}
