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

function getUserContext(
  email: string | undefined,
  workplaceFqdn: string | undefined
): { localpart: string | undefined; tdriveBaseUrl: string | null } {
  const localpart = email?.split('@')[0]
  const tdriveBaseUrl = resolveTdriveUrl({ localpart, workplaceFqdn })
  return { localpart, tdriveBaseUrl }
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

  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )
  const email = useAppSelector(state => state.user.userData?.email)
  const idToken = useAppSelector(state => state.user.tokens?.id_token)

  const openPicker = useCallback(async () => {
    const { tdriveBaseUrl } = getUserContext(email, workplaceFqdn)

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
  }, [email, workplaceFqdn, idToken])

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
