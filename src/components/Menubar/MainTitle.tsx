import { useAppDispatch } from '@/app/hooks'
import { setView } from '@/features/Settings/SettingsSlice'
import logo from '@/static/header-logo.svg'
import { CalendarApi } from '@fullcalendar/core'
import { Button } from '@linagora/twake-mui'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { CALENDAR_VIEWS } from '../Calendar/utils/constants'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'

export type MainTitleProps = {
  calendarRef: React.RefObject<CalendarApi | null>
  currentView: string
  onViewChange?: (view: string) => void
  onDateChange?: (date: Date) => void
}

export const MainTitle: React.FC<MainTitleProps> = ({
  calendarRef,
  currentView,
  onViewChange,
  onDateChange
}: MainTitleProps) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { isTablet, isTooSmall: isMobile } = useScreenSizeDetection()

  const isDesktop = !isTablet && !isMobile

  const handleLogoClick = (): void => {
    if (!calendarRef.current) return

    dispatch(setView('calendar'))

    if (currentView !== CALENDAR_VIEWS.timeGridWeek && isDesktop) {
      calendarRef.current.changeView(CALENDAR_VIEWS.timeGridWeek)
      onViewChange?.(CALENDAR_VIEWS.timeGridWeek)
    }

    if (currentView !== CALENDAR_VIEWS.timeGridDay && !isDesktop) {
      calendarRef.current.changeView(CALENDAR_VIEWS.timeGridDay)
      onViewChange?.(CALENDAR_VIEWS.timeGridDay)
    }

    calendarRef.current.today()

    onDateChange?.(calendarRef.current.getDate())
  }

  return (
    <div className="menubar-item tc-home">
      <Button
        onClick={handleLogoClick}
        aria-label={t('menubar.logoAlt')}
        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
      >
        <img
          className={`logo ${isMobile ? 'logo--mobile' : ''}`}
          src={logo}
          alt={t('menubar.logoAlt')}
          onClick={handleLogoClick}
        />
      </Button>
    </div>
  )
}
