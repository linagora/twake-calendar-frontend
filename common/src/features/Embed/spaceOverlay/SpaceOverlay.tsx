// A copy of the TwakeSpace overlay of @linagora/twake-mui 10.5
// (packages/twake-mui/src/components/SpaceOverlay, twake-ui#137), for a
// Calendar still on twake-mui 5: to drop, with this folder, once Calendar
// takes twake-mui 10.4 or later, which exports the same names.
//
import { Portal } from '@mui/material'
import type { ThemeOptions } from '@mui/material/styles'
import React, {
  createContext,
  useContext,
  useSyncExternalStore,
  type FC,
  type ReactNode
} from 'react'

import type { SpaceOverlay, SpaceOverlayStatus } from './connectSpaceOverlay'

const SpaceOverlayContext = createContext<SpaceOverlay | null>(null)

export interface SpaceOverlayProviderProps {
  /** From `connectSpaceOverlay`, null outside TwakeSpace */
  overlay: SpaceOverlay | null
  children?: ReactNode
}

export const SpaceOverlayProvider: FC<SpaceOverlayProviderProps> = ({
  overlay,
  children
}) => (
  <SpaceOverlayContext.Provider value={overlay}>
    {children}
  </SpaceOverlayContext.Provider>
)

const NO_OVERLAY = (): (() => void) => () => undefined

function useOverlayStatus(): SpaceOverlayStatus | null {
  const overlay = useContext(SpaceOverlayContext)
  return useSyncExternalStore(
    overlay?.subscribe ?? NO_OVERLAY,
    () => overlay?.getStatus() ?? null
  )
}

/**
 * The window of the overlay of TwakeSpace once connected, else null: what
 * renders there is laid out on its size, not on this frame's
 */
export function useOverlayWindow(): Window | null {
  const overlay = useContext(SpaceOverlayContext)
  const status = useOverlayStatus()
  return status === 'connected'
    ? (overlay?.getBody()?.ownerDocument.defaultView ?? null)
    : null
}

/**
 * Renders its children on the overlay of TwakeSpace when the app is framed
 * there, in place otherwise. Menus and tooltips opened inside follow: MUI
 * portals them into the document of their anchor.
 */
export const OverlayPortal: FC<{ children?: ReactNode }> = ({ children }) => {
  const overlay = useContext(SpaceOverlayContext)
  const status = useOverlayStatus()
  // Shown in place first, then moved, it would mount twice: a window being
  // written in would lose what it holds
  if (status === 'connecting') return null
  const body = status === 'connected' ? (overlay?.getBody() ?? null) : null
  return (
    <Portal container={body} disablePortal={body === null}>
      {children}
    </Portal>
  )
}

/**
 * Theme options sending every dialog and temporary drawer to the overlay, so
 * they are centred on the window of TwakeSpace and dim all of it. Built once:
 * the theme provider rebuilds the theme when they change.
 */
export function overlayThemeOptions(overlay: SpaceOverlay): ThemeOptions {
  // Null before TwakeSpace answers: MUI then portals into the app's own body
  const container = (): HTMLElement | null => overlay.getBody()
  return {
    components: {
      MuiDialog: { defaultProps: { container } },
      // Its backdrop dims all of TwakeSpace: shown at once with its panel,
      // not faded in over the whole page
      MuiDrawer: {
        defaultProps: {
          container,
          slotProps: { backdrop: { transitionDuration: 0 } }
        }
      }
    }
  }
}
