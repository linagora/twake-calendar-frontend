import { useCallback, useState } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { exchangeToken, createIntent } from '../TdriveDao'
import { useTdriveUserContext } from './useTdriveUserContext'

export interface TdriveFile {
  id: string
  name: string
  url: string
  type: 'sharingLink' | 'downloadLink'
}

interface UseTdrivePickerReturn {
  isOpen: boolean
  iframeUrl: string | null
  openPickerError: string | null
  openPicker: () => Promise<void>
  closePicker: () => void
  handleFileSelected: (file: TdriveFile) => void
}

interface UseTdrivePickerProps {
  onFileSelected: (file: TdriveFile) => void
}

async function fetchIntentUrl(
  tdriveBaseUrl: string,
  idToken: string
): Promise<string | null> {
  const tokenResponse = await exchangeToken(tdriveBaseUrl, idToken)
  const intentResponse = await createIntent(
    tdriveBaseUrl,
    tokenResponse.access_token
  )

  return intentResponse.data.attributes.services[0]?.href ?? null
}

export function useTdrivePicker({
  onFileSelected
}: UseTdrivePickerProps): UseTdrivePickerReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [iframeUrl, setIframeUrl] = useState<string | null>(null)
  const [openPickerError, setOpenPickerError] = useState<string | null>(null)

  const { tdriveBaseUrl } = useTdriveUserContext()
  const idToken = useAppSelector(state => state.user.tokens?.id_token)

  const openPicker = useCallback(async () => {
    setOpenPickerError(null)
    if (!tdriveBaseUrl) {
      setOpenPickerError('tdriveUrlNotConfigured')
      return
    }

    if (!idToken) {
      setOpenPickerError('tdriveTokenUnavailable')
      return
    }

    try {
      const intentUrl = await fetchIntentUrl(tdriveBaseUrl, idToken)

      if (!intentUrl) {
        setOpenPickerError('tdriveNoIntentUrl')
        return
      }

      setIframeUrl(intentUrl)
      setIsOpen(true)
    } catch (error) {
      console.error('Failed to open Tdrive picker:', error)
      setOpenPickerError('tdrivePickerFailed')
    }
  }, [tdriveBaseUrl, idToken])

  const closePicker = useCallback(() => {
    setIsOpen(false)
    setIframeUrl(null)
  }, [])

  const handleFileSelected = useCallback(
    (file: TdriveFile) => {
      onFileSelected(file)
      closePicker()
    },
    [onFileSelected, closePicker]
  )

  return {
    isOpen,
    iframeUrl,
    openPickerError,
    openPicker,
    closePicker,
    handleFileSelected
  }
}
