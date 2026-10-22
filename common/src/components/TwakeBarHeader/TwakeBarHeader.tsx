import {
  SdkProvider,
  TWAKE_BAR_HEIGHT,
  TwakeBar,
  type TwakeBarFallback
} from '@linagora/twake-bar'
import { logOut } from '@linagora/twake-oidc'
import React, { useLayoutEffect, useMemo } from 'react'
import type { RootState } from '@common/app/store'
import { useAppSelector } from '@common/app/hooks'
import { selectPlatformURL } from '@common/app/selectors/selectPlatformURL'
import { twakeSpace } from '@common/features/Embed/twakeSpace'
import { getPlatformSdk } from '@common/utils/sdkSession'
import { getUserDisplayName } from '@common/utils/userUtils'

const selectIsAppLoading = (state: RootState): boolean =>
  state.loading.isLoading

const selectUser = (state: RootState): RootState['user']['userData'] =>
  state.user.userData

const setBarHeight = (height: string | null): void => {
  if (height) {
    document.documentElement.style.setProperty('--twake-bar-height', height)
  } else {
    document.documentElement.style.removeProperty('--twake-bar-height')
  }
}

const BAR_APP = {
  slug: 'calendar',
  name: 'Twake Calendar',
  icon: new URL('/calendar.svg', window.location.origin).href,
  textIcon: new URL('/calendar-text.svg', window.location.origin).href
}

const handleLogOut = (): void => void logOut()

/**
 * The Twake bar, pinned on top of the page in the space the body reserves,
 * once calendar's loader is gone. Rendered under the theme and i18n providers,
 * which the bar follows. Not shown when TwakeSpace frames calendar: the bar of
 * TwakeSpace is above it.
 *
 * The bar shows the platform session, which calendar signs in at load.
 * Without a platform, or when the token exchange fails, it shows calendar's
 * apps and user instead.
 */
export const TwakeBarHeader = (): JSX.Element | null => {
  const isAppLoading = useAppSelector(selectIsAppLoading)
  const platformURL = useAppSelector(selectPlatformURL)
  const user = useAppSelector(selectUser)
  const isShown = twakeSpace === null && !isAppLoading

  const fallback = useMemo<TwakeBarFallback>(
    () => ({
      helpLink: window.SUPPORT_URL,
      apps: (window.appList ?? []).map(app => ({
        name: app.name,
        href: app.link,
        icon: app.icon
      })),
      // The user data stays empty until the user is signed in
      user: user?.email
        ? { name: getUserDisplayName(user), email: user.email }
        : undefined
    }),
    [user]
  )

  // A layout effect reserves the bar space before the paint that removes the
  // loader, so the loader leaves room for the bar at once
  useLayoutEffect(() => {
    if (!isShown) return
    setBarHeight(TWAKE_BAR_HEIGHT)
    return (): void => setBarHeight(null)
  }, [isShown])

  if (!isShown) return null

  const sdk = platformURL ? getPlatformSdk(platformURL) : null
  const bar = (
    <TwakeBar app={BAR_APP} onLogOut={handleLogOut} fallback={fallback} />
  )

  return (
    <div id="twake-bar">
      {sdk ? <SdkProvider client={sdk}>{bar}</SdkProvider> : bar}
    </div>
  )
}
