import { useCallback, useEffect, useRef, useState } from 'react'
import { TdriveFile } from './useTdrivePicker'
import {
  buildReadyResponse,
  extractIntentId,
  getMessageType,
  isReadyMessage,
  parseFileSelection
} from '../../Tdrive/components/TdrivePickerMessageUtils'

const HANDSHAKE_TIMEOUT_MS = 30_000

export type IframeState = 'loading' | 'ready' | 'error'

interface UsePickerIframeStateReturn {
  iframeRef: React.RefObject<HTMLIFrameElement>
  iframeState: IframeState
}

export function usePickerIframeState(
  iframeUrl: string,
  onFileSelected: (file: TdriveFile) => void
): UsePickerIframeStateReturn {
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

  return { iframeRef, iframeState }
}
