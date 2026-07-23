import { useCallback, useState } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { exchangeToken, createIntent } from '../TdriveDao'
import { resolveTdriveUrl } from '@common/utils/tdriveUrlUtils'

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

export function useTdrivePicker({
  onFileSelected
}: UseTdrivePickerProps): UseTdrivePickerReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [iframeUrl, setIframeUrl] = useState<string | null>(null)

  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )
  const email = useAppSelector(state => state.user.userData?.email)
  const idToken = useAppSelector(state => state.user.tokens?.id_token)

  const openPicker = useCallback(async () => {
    const localpart = email?.split('@')[0]
    const tdriveBaseUrl = resolveTdriveUrl({ localpart, workplaceFqdn })

    if (!tdriveBaseUrl) {
      console.error('Tdrive URL is not configured')
      return
    }

    try {
      // Step 1: Exchange token
      if (!idToken) {
        console.error('idToken is not available')
        return
      }
      const tokenResponse = await exchangeToken(tdriveBaseUrl, idToken)
      const intentResponse = await createIntent(
        tdriveBaseUrl,
        tokenResponse.access_token
      )

      const intentUrl = intentResponse.data.attributes.services[0]?.href

      if (!intentUrl) {
        console.error('No intent service URL returned')
        return
      }
      setIframeUrl(intentUrl)
      setIsOpen(true)
    } catch (error) {
      console.error('Failed to open Tdrive picker:', error)
    }
  }, [email, workplaceFqdn])

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
