import { useAppDispatch } from '@/app/hooks'
import { setView } from '@/features/Settings/SettingsSlice'
import { Logout } from '@/features/User/oidcAuth'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { redirectTo } from '@/utils/navigation'
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

  const handleLogoutClick = async (): Promise<void> => {
    try {
      const logoutUrl = await Logout()
      redirectTo(logoutUrl.href)
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      sessionStorage.removeItem('tokenSet')
      handleUserMenuClose()
    }
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
