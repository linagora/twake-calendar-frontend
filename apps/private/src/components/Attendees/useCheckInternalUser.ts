import { useEffect, useState } from 'react'
import { searchPeople } from '@common/features/User/UserDao'

export function useCheckInternalUser(
  email: string | undefined,
  chatSpaUrl: string | null
): { isInternalUser: boolean; loading: boolean } {
  const [isInternalUser, setIsInternalUser] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false
    const checkUser = async (): Promise<void> => {
      if (!email || !chatSpaUrl) {
        setIsInternalUser(false)
        setLoading(false)
        return
      }
      setLoading(true)

      let internalUser = false
      try {
        const res = await searchPeople(email, ['user'])
        internalUser = res.length > 0
      } catch (e) {
        console.error('Error checking internal user:', e)
      }

      if (!cancelled) {
        setIsInternalUser(internalUser)
        setLoading(false)
      }
    }
    void checkUser()

    return (): void => {
      cancelled = true
    }
  }, [email, chatSpaUrl])

  return { isInternalUser, loading }
}
