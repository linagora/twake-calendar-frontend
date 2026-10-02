import type { RootState } from '@common/app/store'
import { useAppSelector } from '@common/app/hooks'
import { logOut } from '@common/components/Calendar/hooks/useUtilMenus'
import { useIsInIframe } from '@common/contexts/EmbeddingContext'
import { exchangeToken } from '@common/features/Tdrive/TdriveDao'
import { resolveUriTemplate } from '@common/utils/uriTemplateUtils'
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState
} from 'react'

interface TwakeBarMountConfig {
  appSlug: string
  appName: string
  appIcon?: string
  appTextIcon?: string
  locale?: string
  theme?: 'light' | 'dark'
  onLogOut?: () => void
}

interface TwakeBarCredentials {
  accessToken: string
  refreshToken: string
  cozyURL: string
}

/** API the standalone bar script exposes on window.TwakeBar. */
export interface TwakeBarApi {
  mount: (config: TwakeBarMountConfig) => void
  setCredentials: (credentials: TwakeBarCredentials) => void
  setLocale: (locale: string) => void
}

// A second copy of the script would start a second bar, that never gets
// mounted: the script is added once, and waited for by every caller.
const loadBarScript = (url: string, integrity?: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.TwakeBar) {
      resolve()
      return
    }
    let script = Array.from(document.scripts).find(
      element => element.getAttribute('src') === url
    )
    if (!script) {
      script = document.createElement('script')
      script.src = url
      if (integrity) {
        // The browser refuses the script if it is not the expected version
        script.integrity = integrity
        script.crossOrigin = 'anonymous'
      }
      document.head.appendChild(script)
    }
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () =>
      reject(new Error(`Could not load ${url}`))
    )
  })

const getCozyURL = (
  email: string | undefined,
  workplaceFqdn: string | undefined
): string | null => {
  const workplace = resolveUriTemplate('{workplaceFqdn}', {
    localpart: email?.split('@')[0],
    workplaceFqdn
  })
  return workplace ? `https://${workplace}` : null
}

const selectIdToken = (state: RootState): string | undefined =>
  state.user.tokens?.id_token

const selectCozyURL = (state: RootState): string | null =>
  getCozyURL(state.user.userData?.email, state.user.userData?.workplaceFqdn)

const selectIsAppLoading = (state: RootState): boolean =>
  state.loading.isLoading

/**
 * Loads the bar script and runs the token_exchange on the user's Cozy.
 *
 * @returns the credentials of the bar, or null when anything failed.
 */
const prepareBarCredentials = async (
  barUrl: string,
  cozyURL: string,
  idToken: string
): Promise<TwakeBarCredentials | null> => {
  try {
    const [tokens] = await Promise.all([
      exchangeToken(cozyURL, idToken),
      loadBarScript(barUrl, window.TWAKE_BAR_INTEGRITY)
    ])
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      cozyURL
    }
  } catch (error) {
    console.error('Twake bar could not be prepared:', error)
    return null
  }
}

/**
 * Mounts the bar with its credentials and reserves its space.
 *
 * @returns whether the bar is mounted.
 */
const tryMountTwakeBar = (
  locale: string,
  credentials: TwakeBarCredentials
): boolean => {
  try {
    if (!window.TwakeBar) throw new Error('window.TwakeBar is missing')
    window.TwakeBar.mount({
      appSlug: 'calendar',
      appName: 'Twake Calendar',
      appIcon: new URL('/calendar.svg', window.location.origin).href,
      appTextIcon: new URL('/calendar-text.svg', window.location.origin).href,
      locale,
      // Calendar has no dark mode
      theme: 'light',
      onLogOut: () => void logOut()
    })
    window.TwakeBar.setCredentials(credentials)
    // Height the page reserves at its top for the bar
    document.documentElement.style.setProperty('--twake-bar-height', '3rem')
    return true
  } catch (error) {
    console.error('Twake bar could not be mounted:', error)
    return false
  }
}

/**
 * Prepares the credentials of the bar once logged in. They stay null when
 * anything fails: the bar stays off.
 */
const useBarCredentials = (
  barUrl: string | undefined
): TwakeBarCredentials | null => {
  const idToken = useAppSelector(selectIdToken)
  const cozyURL = useAppSelector(selectCozyURL)
  const [credentials, setCredentials] = useState<TwakeBarCredentials | null>(
    null
  )

  useEffect(() => {
    if (!barUrl || !idToken || !cozyURL) return

    let cancelled = false
    const prepare = async (): Promise<void> => {
      const result = await prepareBarCredentials(barUrl, cozyURL, idToken)
      if (!cancelled) setCredentials(result)
    }
    void prepare()

    return (): void => {
      cancelled = true
    }
  }, [barUrl, idToken, cozyURL])

  return credentials
}

/**
 * Shows the Twake bar once calendar's loader is gone, when TWAKE_BAR_URL is set
 * and calendar is not embedded (the embedding workplace already provides its
 * own bar).
 *
 * While calendar loads, the bar script and the token_exchange on the user's
 * Cozy run in the background. When the loader is gone, the bar is mounted with
 * its credentials before the next paint, so the loader leaves room for the bar
 * at once. Any failure leaves the bar off: calendar keeps its own top bar.
 *
 * @returns whether the bar is mounted.
 */
const useTwakeBar = (locale: string): boolean => {
  const isInIframe = useIsInIframe()
  const isAppLoading = useAppSelector(selectIsAppLoading)
  const credentials = useBarCredentials(
    isInIframe ? undefined : window.TWAKE_BAR_URL
  )
  const [isBarMounted, setIsBarMounted] = useState(false)

  // A layout effect mounts the bar before the paint that removes the loader
  useLayoutEffect(() => {
    if (!credentials || isAppLoading || isBarMounted) return
    setIsBarMounted(tryMountTwakeBar(locale, credentials))
    // locale is given at mount only, setLocale follows its changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials, isAppLoading, isBarMounted])

  useEffect(() => {
    if (isBarMounted) window.TwakeBar?.setLocale(locale)
  }, [isBarMounted, locale])

  return isBarMounted
}

const EmbeddedContext = createContext(false)

export const TwakeBarProvider = ({
  locale,
  children
}: {
  locale: string
  children: React.ReactNode
}): JSX.Element => {
  const isInIframe = useIsInIframe()
  const isBarMounted = useTwakeBar(locale)

  return (
    <EmbeddedContext.Provider value={isInIframe || isBarMounted}>
      {children}
    </EmbeddedContext.Provider>
  )
}

/**
 * Whether another top bar surrounds calendar: the workplace one when embedded
 * in an iframe, or the mounted Twake bar. Calendar then drops its own top
 * header and lays its controls out below that bar. Always false outside
 * TwakeBarProvider.
 */
export const useIsEmbedded = (): boolean => useContext(EmbeddedContext)
