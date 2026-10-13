import { resolveUriTemplate } from '@linagora/twake-utils'
import type { RootState } from '@common/app/store'
import { useAppSelector } from '@common/app/hooks'
import { logOut } from '@common/components/Calendar/hooks/useUtilMenus'
import { useIsInIframe } from '@common/contexts/EmbeddingContext'
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

interface TwakeBarCredentials {
  /** OIDC id token of the user, the bar exchanges it on the user's Cozy */
  idToken: string
  cozyURL: string
}

interface TwakeBarMountConfig extends Partial<TwakeBarCredentials> {
  appSlug: string
  appName: string
  appIcon?: string
  appTextIcon?: string
  locale?: string
  theme?: 'light' | 'dark'
  onLogOut?: () => void
}

/**
 * API the standalone bar script exposes on window.TwakeBar. Every call returns
 * a promise, rejected when the bar cannot load or the call fails.
 */
export interface TwakeBarApi {
  mount: (config: TwakeBarMountConfig) => Promise<void>
  unmount: () => Promise<void>
  setCredentials: (credentials: TwakeBarCredentials) => Promise<void>
  setLocale: (locale: string) => Promise<void>
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
    workplaceFqdn,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
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
 * Loads the bar script in the background.
 *
 * @returns whether window.TwakeBar is available.
 */
const useBarScript = (barUrl: string | undefined): boolean => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!barUrl) return

    let cancelled = false
    const load = async (): Promise<void> => {
      try {
        await loadBarScript(barUrl, window.TWAKE_BAR_INTEGRITY)
        if (!window.TwakeBar) throw new Error('window.TwakeBar is missing')
        if (!cancelled) setIsLoaded(true)
      } catch (error) {
        console.error('Twake bar could not be loaded:', error)
      }
    }
    void load()

    return (): void => {
      cancelled = true
    }
  }, [barUrl])

  return isLoaded
}

// Async so that anything thrown also rejects
const mountTwakeBar = async (
  locale: string,
  credentials: TwakeBarCredentials
): Promise<void> => {
  if (!window.TwakeBar) throw new Error('window.TwakeBar is missing')
  await window.TwakeBar.mount({
    appSlug: 'calendar',
    appName: 'Twake Calendar',
    appIcon: new URL('/calendar.svg', window.location.origin).href,
    appTextIcon: new URL('/calendar-text.svg', window.location.origin).href,
    locale,
    // Calendar has no dark mode
    theme: 'light',
    onLogOut: () => void logOut(),
    ...credentials
  })
}

const setBarHeight = (height: string | null): void => {
  if (height) {
    document.documentElement.style.setProperty('--twake-bar-height', height)
  } else {
    document.documentElement.style.removeProperty('--twake-bar-height')
  }
}

/**
 * Shows the Twake bar once calendar's loader is gone, when TWAKE_BAR_URL is set
 * and calendar is not embedded (the embedding workplace already provides its
 * own bar).
 *
 * While calendar loads, the bar script loads in the background. When the
 * loader is gone, the bar is mounted with the user's id token before the next
 * paint, so the loader leaves room for the bar at once. The bar exchanges the
 * id token on the user's Cozy and shows a placeholder avatar meanwhile. If
 * anything fails, the bar is removed and calendar gets its own top bar back.
 *
 * @returns whether the bar is mounted.
 */
const useTwakeBar = (locale: string): boolean => {
  const isInIframe = useIsInIframe()
  const isAppLoading = useAppSelector(selectIsAppLoading)
  const idToken = useAppSelector(selectIdToken)
  const cozyURL = useAppSelector(selectCozyURL)
  const isScriptLoaded = useBarScript(
    isInIframe ? undefined : window.TWAKE_BAR_URL
  )
  const [isBarMounted, setIsBarMounted] = useState(false)
  const hasFailed = useRef(false)
  // id token the bar was last given, to give it the renewed ones only
  const barIdToken = useRef<string>()

  // A layout effect mounts the bar before the paint that removes the loader
  useLayoutEffect(() => {
    if (!isScriptLoaded || !idToken || !cozyURL || isAppLoading) return
    if (isBarMounted || hasFailed.current) return

    barIdToken.current = idToken
    setBarHeight('3rem')
    setIsBarMounted(true)
    mountTwakeBar(locale, { idToken, cozyURL }).catch((error: unknown) => {
      console.error('Twake bar could not be mounted:', error)
      hasFailed.current = true
      void window.TwakeBar?.unmount()
      setBarHeight(null)
      setIsBarMounted(false)
    })
    // locale is given at mount only, setLocale follows its changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScriptLoaded, idToken, cozyURL, isAppLoading, isBarMounted])

  useEffect(() => {
    if (!isBarMounted || !idToken || !cozyURL) return
    if (idToken === barIdToken.current) return
    barIdToken.current = idToken
    window.TwakeBar?.setCredentials({ idToken, cozyURL }).catch(
      (error: unknown) => {
        console.error('Twake bar could not renew its token:', error)
      }
    )
  }, [isBarMounted, idToken, cozyURL])

  useEffect(() => {
    if (isBarMounted) void window.TwakeBar?.setLocale(locale)
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
