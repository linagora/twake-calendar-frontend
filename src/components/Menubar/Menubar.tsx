import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { setView } from '@/features/Settings/SettingsSlice'
import { Logout } from '@/features/User/oidcAuth'
import { userData } from '@/features/User/userDataTypes'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { redirectTo } from '@/utils/navigation'
import { CalendarApi } from '@fullcalendar/core'
import React, { useEffect, useState } from 'react'
import { push } from 'redux-first-history'
import { useI18n } from 'twake-i18n'
import { DesktopMenubar } from './DesktopMenubar'
import './Menubar.styl'
import { TabletMenubar } from './TabletMenubar'

export type MenubarProps = {
  calendarRef: React.RefObject<CalendarApi | null>
  onRefresh: () => void
  currentDate: Date
  onDateChange?: (date: Date) => void
  currentView: string
  onViewChange?: (view: string) => void
  isIframe?: boolean
  onToggleSidebar: () => void
}

export type SharedMenubarProps = MenubarProps & {
  dateLabel: string
  supportLink: string | undefined
  anchorEl: HTMLElement | null
  onAppMenuOpen: (event: React.MouseEvent<HTMLElement>) => void
  onAppMenuClose: () => void
  userMenuAnchorEl: HTMLElement | null
  onUserMenuOpen: (event: React.MouseEvent<HTMLElement>) => void
  onUserMenuClose: () => void
  onSettingsClick: () => void
  onLogoutClick: () => void
  onNavigate: (action: 'prev' | 'next' | 'today') => void
  onViewChange: (view: string) => void
  user: userData | null
}

export function Menubar({
  calendarRef,
  onRefresh,
  currentDate,
  onDateChange,
  currentView,
  onViewChange,
  isIframe,
  onToggleSidebar
}: MenubarProps): JSX.Element {
  const { t } = useI18n() // deliberately NOT using f()

  const user = useAppSelector(state => state.user.userData)
  const supportLink = window.SUPPORT_URL
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(
    null
  )
  const dispatch = useAppDispatch()
  const { isTablet } = useScreenSizeDetection()

  useEffect(() => {
    if (!user) {
      dispatch(push('/'))
    }
  }, [dispatch, user])

  if (!user) {
    return null
  }

  const handleNavigation = async (action: 'prev' | 'next' | 'today') => {
    if (!calendarRef.current) return
    await dispatch(setView('calendar'))
    switch (action) {
      case 'prev':
        calendarRef.current.prev()
        break
      case 'next':
        calendarRef.current.next()
        break
      case 'today':
        calendarRef.current.today()
        break
    }

    // Notify parent about date change after navigation
    if (onDateChange) {
      const newDate = calendarRef.current.getDate()
      onDateChange(newDate)
    }
  }

  const handleViewChange = async (view: string) => {
    if (!calendarRef.current) return
    await dispatch(setView('calendar'))

    calendarRef.current.changeView(view)

    // Notify parent about view change
    if (onViewChange) {
      onViewChange(view)
    }

    // Notify parent about date change after view change
    if (onDateChange) {
      const newDate = calendarRef.current.getDate()
      onDateChange(newDate)
    }
  }

  const handleAppMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget)

  const handleAppMenuClose = () => setAnchorEl(null)

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setUserMenuAnchorEl(event.currentTarget)

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null)
  }

  const handleSettingsClick = () => {
    dispatch(setView('settings'))
    handleUserMenuClose()
  }

  const handleLogoutClick = async () => {
    const logoutUrl = await Logout()
    sessionStorage.removeItem('tokenSet')
    redirectTo(logoutUrl.href)
    handleUserMenuClose()
  }

  // Use i18n for month names instead of date-fns
  const monthIndex = currentDate.getMonth()
  const year = currentDate.getFullYear()
  const monthName = t(`months.standalone.${monthIndex}`)
  const dateLabel = `${monthName} ${year}`

  const sharedProps: SharedMenubarProps = {
    calendarRef,
    onRefresh,
    currentDate,
    onDateChange,
    currentView,
    onViewChange: handleViewChange,
    isIframe,
    onToggleSidebar,
    dateLabel,
    supportLink,
    anchorEl,
    onAppMenuOpen: handleAppMenuOpen,
    onAppMenuClose: handleAppMenuClose,
    userMenuAnchorEl,
    onUserMenuOpen: handleUserMenuOpen,
    onUserMenuClose: handleUserMenuClose,
    onSettingsClick: handleSettingsClick,
    onLogoutClick: handleLogoutClick,
    onNavigate: handleNavigation,
    user
  }

  return isTablet ? (
    <TabletMenubar {...sharedProps} />
  ) : (
    <DesktopMenubar {...sharedProps} />
  )
}
