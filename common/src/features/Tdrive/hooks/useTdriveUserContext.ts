import { useAppSelector } from '@common/app/hooks'
import { resolveTdriveUrl } from '@common/utils/tdriveUrlUtils'

interface UseTdriveUserContextReturn {
  localpart: string | undefined
  tdriveBaseUrl: string | null
}

export function useTdriveUserContext(): UseTdriveUserContextReturn {
  const email = useAppSelector(state => state.user.userData?.email)
  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )

  const localpart = email?.split('@')[0]
  const tdriveBaseUrl = resolveTdriveUrl({ localpart, workplaceFqdn })

  return { localpart, tdriveBaseUrl }
}
