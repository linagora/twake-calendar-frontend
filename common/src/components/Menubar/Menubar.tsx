import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setView } from '@common/features/Settings/SettingsSlice'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { CalendarApi } from '@fullcalendar/core'
import React, { useEffect } from 'react'
import { push } from 'redux-first-history'
import { useI18n } from 'twake-i18n'
import { DesktopMenubar } from './DesktopMenubar'
import './Menubar.styl'
import { TabletMenubar } from './TabletMenubar'
import { MobileMenubar } from './MobileMenuBar'
import { DisplayedPeriod, formatPeriodLabel } from './periodLabel'

export type AppIconProps = {
  name: string
  link: string
  icon: string
}

export type MenubarProps = {
  calendarRef: React.RefObject<CalendarApi | null>
  onRefresh: () => void
  currentDate: Date
  displayedPeriod?: DisplayedPeriod
  onDateChange?: (date: Date) => void
  currentView: string
  onViewChange?: (view: string) => void
  onToggleSidebar: () => void
}

export type SharedMenubarProps = MenubarProps & {
  dateLabel: string
  onNavigate: (action: 'prev' | 'next' | 'today') => void
  onViewChange: (view: string) => void
}

export const Menubar: React.FC<MenubarProps> = ({
  calendarRef,
  onRefresh,
  currentDate,
  displayedPeriod,
  onDateChange,
  currentView,
  onViewChange,
  onToggleSidebar
}) => {
  const { t } = useI18n() // deliberately NOT using f()

  const user = useAppSelector(state => state.user.userData)

  const dispatch = useAppDispatch()
  const { isTablet, isTooSmall: isMobile } = useScreenSizeDetection()

  useEffect(() => {
    if (!user) {
      dispatch(push('/'))
    }
  }, [dispatch, user])

  if (!user) {
    return null
  }

  const handleNavigation = (action: 'prev' | 'next' | 'today'): void => {
    if (!calendarRef.current) return
    dispatch(setView('calendar'))
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

  const handleViewChange = (view: string): void => {
    // Notify parent about view change
    if (onViewChange) {
      onViewChange(view)
    }
  }

  // Use i18n for month names instead of date-fns
  const dateLabel = formatPeriodLabel(displayedPeriod, currentDate, t)

  const sharedProps: SharedMenubarProps = {
    calendarRef,
    onRefresh,
    currentDate,
    onDateChange,
    currentView,
    onViewChange: handleViewChange,
    onToggleSidebar,
    dateLabel,
    onNavigate: handleNavigation
  }

  if (isMobile) {
    return (
      <MobileMenubar
        calendarRef={calendarRef}
        currentDate={currentDate}
        currentView={currentView}
        dateLabel={dateLabel}
        shortDateLabel={formatPeriodLabel(
          displayedPeriod,
          currentDate,
          t,
          'short'
        )}
        onDateChange={onDateChange}
        handleNavigation={handleNavigation}
        onOpenSidebar={onToggleSidebar}
      />
    )
  }

  return isTablet ? (
    <TabletMenubar {...sharedProps} />
  ) : (
    <DesktopMenubar {...sharedProps} />
  )
}
