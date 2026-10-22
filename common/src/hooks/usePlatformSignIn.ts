import { useAppSelector } from '@common/app/hooks'
import { selectPlatformURL } from '@common/app/selectors/selectPlatformURL'
import { ensureSdkSignedIn } from '@common/utils/sdkSession'
import { useEffect } from 'react'

/**
 * Signs the platform session in as soon as calendar knows the user, while the
 * id token is fresh: what talks to the platform then works for the whole
 * session, long after the id token has expired.
 */
export function usePlatformSignIn(): void {
  const platformURL = useAppSelector(selectPlatformURL)
  const idToken = useAppSelector(state => state.user.tokens?.id_token)

  useEffect(() => {
    if (!platformURL || !idToken) return
    ensureSdkSignedIn(platformURL, idToken).catch((error: unknown) => {
      console.error('Platform sign-in failed:', error)
    })
  }, [platformURL, idToken])
}
