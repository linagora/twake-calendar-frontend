import CozyBridge from 'cozy-external-bridge'
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'

/**
 * The same SPA is served either directly on its own domain, or embedded as a
 * Cozy app inside the workplace. Being embedded is what tells us the workplace
 * already provides its own top bar, and it is also what decides whether
 * cross-origin calls to the sibling Cozy apps are allowed.
 *
 * The detection itself is cheap but it is a runtime, process-wide fact: resolve
 * it once at the root instead of instantiating a bridge in every consumer.
 */
const detectIsInIframe = (): boolean => new CozyBridge().isInIframe()

interface EmbeddingContextValue {
  isInIframe: boolean
  /**
   * Calls the parent window's `fetchJSON` over the cozy bridge. `null` until
   * the bridge has been set up (or when the app is not embedded), so consumers
   * can guard with a simple null check.
   */
  fetchJSON: ((data: object) => Promise<object>) | null
}

const EmbeddingContext = createContext<EmbeddingContextValue | null>(null)

export const EmbeddingProvider = ({
  children
}: {
  children: React.ReactNode
}): JSX.Element => {
  // A single bridge instance owns the iframe detection and the parent link.
  const [bridge] = useState(() => new CozyBridge())

  const isInIframe = useMemo(() => bridge.isInIframe(), [bridge])
  const [isBridgeReady, setIsBridgeReady] = useState(false)

  // When embedded, ask the parent window for its origin and wire the bridge to
  // it. The origin is the one the parent itself reports, so the link is only
  // ever established with the actual container.
  useEffect(() => {
    if (!isInIframe) return
    let cancelled = false

    const setup = async (): Promise<void> => {
      const parentOrigin = await bridge.requestParentOrigin()
      if (cancelled || !parentOrigin) return
      bridge.setupBridge(parentOrigin)
      if (cancelled) return
      setIsBridgeReady(true)
    }

    void setup()

    return (): void => {
      cancelled = true
    }
  }, [bridge, isInIframe])

  console.log('🔴 isBridgeReady', isBridgeReady)
  console.log('🔴 bridge', bridge)

  const value = useMemo<EmbeddingContextValue>(
    () => ({
      isInIframe,
      fetchJSON: isBridgeReady ? bridge.fetchJSON : null
    }),
    [bridge, isInIframe, isBridgeReady]
  )

  return (
    <EmbeddingContext.Provider value={value}>
      {children}
    </EmbeddingContext.Provider>
  )
}

/**
 * The embedding state and the bridge-backed methods.
 *
 * Falls back to detecting on the spot when rendered outside the provider, so
 * that isolated renders (unit tests, deep links mounted on their own) keep
 * behaving like the full app. Outside the provider the bridge is never set up,
 * so `fetchJSON` is `null`.
 */
export const useEmbedding = (): EmbeddingContextValue => {
  const provided = useContext(EmbeddingContext)

  return useMemo(
    () =>
      provided === null
        ? { isInIframe: detectIsInIframe(), fetchJSON: null }
        : provided,
    [provided]
  )
}

/**
 * Whether the app is embedded (as a Cozy app) rather than served standalone.
 */
export const useIsInIframe = (): boolean => useEmbedding().isInIframe
