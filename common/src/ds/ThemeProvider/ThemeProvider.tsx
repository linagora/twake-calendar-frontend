// Upstream to twake-ui: no. TwakeMuiThemeProvider as it was in
// @linagora/twake-mui 5.1.1: twake-mui 13 restyles every component (cozy-ui
// look, CSS variables, new breakpoints and shadows), this keeps the calendar
// as it was. Drop it for TwakeMuiThemeProvider once legacyOverrides is empty.
import {
  createTheme,
  CssBaseline,
  makePalette,
  theme as twakeTheme
} from '@linagora/twake-mui'
import {
  ThemeProvider as MuiThemeProvider,
  type ThemeOptions
} from '@mui/material/styles'
import React, { useMemo, type ReactElement, type ReactNode } from 'react'

import { legacyOverrides } from './legacyOverrides'

const legacyTheme = createTheme({
  ...createTheme({
    shape: { borderRadius: 6 },
    breakpoints: {
      values: { xs: 0, sm: 480, md: 768, lg: 1023, xl: 1200 }
    },
    zIndex: { modal: 1300 },
    palette: makePalette('light'),
    // twake-mui 13 kept the typography of 5.1.1
    typography: twakeTheme.typography
  }),
  components: legacyOverrides
})

export interface ThemeProviderProps {
  children: ReactNode
  themeOptions?: ThemeOptions
}

export function ThemeProvider({
  children,
  themeOptions
}: ThemeProviderProps): ReactElement {
  const theme = useMemo(
    () => (themeOptions ? createTheme(legacyTheme, themeOptions) : legacyTheme),
    [themeOptions]
  )

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  )
}
