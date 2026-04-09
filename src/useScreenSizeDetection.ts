import { useMediaQuery, useTheme } from '@linagora/twake-mui'

export function useScreenSizeDetection(): {
  isTooSmall: boolean
  isTablet: boolean
} {
  const theme = useTheme()

  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return {
    isTooSmall: isMobile,
    isTablet: !isMobile && !isDesktop
  }
}
