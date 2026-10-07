import { createTheme } from '@mui/material/styles'
import {
  connectSpaceOverlay,
  overlayThemeOptions,
  type SpaceOverlay
} from '@common/features/Embed/spaceOverlay'

describe('the overlay of TwakeSpace', () => {
  it('is not looked for out of a named frame', () => {
    // jsdom: the window is its own parent, and has no name
    expect(connectSpaceOverlay(() => undefined)).toBeNull()
  })

  it('sends the dialogs and drawers to the overlay once connected', () => {
    const body = document.createElement('body')
    const overlay: SpaceOverlay = {
      getStatus: () => 'connected',
      getBody: () => body,
      subscribe: () => () => undefined
    }
    const theme = createTheme(overlayThemeOptions(overlay))
    const container = theme.components?.MuiDialog?.defaultProps?.container
    expect(typeof container).toBe('function')
    expect((container as () => HTMLElement | null)()).toBe(body)
    expect(theme.components?.MuiDrawer?.defaultProps?.container).toBeDefined()
  })
})
