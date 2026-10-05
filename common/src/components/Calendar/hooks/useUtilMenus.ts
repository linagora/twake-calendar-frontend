import { useAppDispatch } from '@common/app/hooks'
import { setView } from '@common/features/Settings/SettingsSlice'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { logOut } from '@linagora/twake-oidc'
import { useEffect, useState } from 'react'

export const useUtilMenus = (): {
  anchorEl: null | HTMLElement
  userMenuAnchorEl: null | HTMLElement
  supportLink: string
  handleAppMenuOpen: (event: React.MouseEvent<HTMLElement>) => void
  handleAppMenuClose: () => void
  handleUserMenuOpen: (event: React.MouseEvent<HTMLElement>) => void
  handleUserMenuClose: () => void
  handleSettingsClick: () => void
  handleLogoutClick: () => Promise<void>
} => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(
    null
  )

  const supportLink = window.SUPPORT_URL

  const dispatch = useAppDispatch()
  const { isTablet, isTooSmall: isMobile } = useScreenSizeDetection()

  useEffect(() => {
    const resetMenuAnchorsOnResize = (): void => {
      setAnchorEl(null)
      setUserMenuAnchorEl(null)
    }
    resetMenuAnchorsOnResize()
  }, [isTablet, isMobile])

  const handleAppMenuOpen = (event: React.MouseEvent<HTMLElement>): void =>
    setAnchorEl(event.currentTarget)

  const handleAppMenuClose = (): void => setAnchorEl(null)

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>): void =>
    setUserMenuAnchorEl(event.currentTarget)

  const handleUserMenuClose = (): void => {
    setUserMenuAnchorEl(null)
  }

  const handleSettingsClick = (): void => {
    dispatch(setView('settings'))
    handleUserMenuClose()
  }

  const handleLogoutClick = (): Promise<void> => {
    handleUserMenuClose()
    return logOut()
  }

  return {
    anchorEl,
    userMenuAnchorEl,
    supportLink,
    handleAppMenuOpen,
    handleAppMenuClose,
    handleUserMenuOpen,
    handleUserMenuClose,
    handleSettingsClick,
    handleLogoutClick
  }
}
