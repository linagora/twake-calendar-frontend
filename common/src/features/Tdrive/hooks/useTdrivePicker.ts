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

  const { tdriveBaseUrl } = useTdriveUserContext()
  const idToken = useAppSelector(state => state.user.tokens?.id_token)

  const openPicker = useCallback(async () => {
    if (!tdriveBaseUrl) {
      console.error('Tdrive URL is not configured')
      return
    }

    if (!idToken) {
      console.error('idToken is not available')
      return
    }

    try {
      const intentUrl = await fetchIntentUrl(tdriveBaseUrl, idToken)

      if (!intentUrl) {
        console.error('No intent service URL returned')
        return
      }

      setIframeUrl(intentUrl)
      setIsOpen(true)
    } catch (error) {
      console.error('Failed to open Tdrive picker:', error)
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
    openPicker,
    closePicker,
    handleFileSelected
  }
}
