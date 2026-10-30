import { OPEN_CALENDAR_SEARCH } from '@common/hooks/useCalendarShortcuts'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { clearSearch } from '@common/features/Search/SearchSlice'
import { setView } from '@common/features/Settings/SettingsSlice'
import { CalendarApi } from '@fullcalendar/core'
import {
  IconButton,
  Stack,
  Typography,
  useMediaQuery
} from '@linagora/twake-mui'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/Search'
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { Tooltip } from '../Tooltip'
import { DatePickerMobile } from './components/DatePickerMobile'
import { SmallNavigationControls } from './components/SmallNavigationControls'
import './Menubar.styl'
import MobileSearchBar from './MobileEventSearchBar'

export interface MobileMenubarProps {
  calendarRef: React.RefObject<CalendarApi | null>
  currentDate: Date
  currentView: string
  dateLabel: string
  // With short month names, for the narrowest phones
  shortDateLabel?: string
  onDateChange?: (date: Date) => void
  handleNavigation: (action: 'prev' | 'next' | 'today') => void
  onOpenSidebar: () => void
}

export const MobileMenubar: React.FC<MobileMenubarProps> = ({
  calendarRef,
  currentDate,
  currentView,
  dateLabel,
  shortDateLabel,
  onDateChange,
  handleNavigation,
  onOpenSidebar
}) => {
  const { t } = useI18n()
  // Below 360px the title gets too narrow for a full month name
  const isNarrow = useMediaQuery('(max-width: 359.95px)')
  const dispatch = useAppDispatch()

  const view = useAppSelector(state => state.settings.view)

  const [openDatePicker, setOpenDatePicker] = useState(false)
  const [openEventSearch, setOpenEventSearch] = useState(false)

  useEffect(() => {
    const openSearch = (): void => setOpenEventSearch(true)
    window.addEventListener(OPEN_CALENDAR_SEARCH, openSearch)
    return () => window.removeEventListener(OPEN_CALENDAR_SEARCH, openSearch)
  }, [])

  // The full title, when it overflows its two lines: up to 390px a period
  // across two months does, whatever the language
  const titleRef = useRef<HTMLElement>(null)
  const [overflowingLabel, setOverflowingLabel] = useState<string | null>(null)
  const showsShortLabel =
    !!shortDateLabel && (isNarrow || overflowingLabel === dateLabel)
  useLayoutEffect(() => {
    const title = titleRef.current
    if (!title || showsShortLabel) return
    const observer = new ResizeObserver(() => {
      if (title.scrollHeight > title.clientHeight + 1) {
        setOverflowingLabel(dateLabel)
      }
    })
    observer.observe(title)
    return (): void => observer.disconnect()
  }, [dateLabel, showsShortLabel])

  const onToggleDatePicker = (): void => {
    setOpenDatePicker(prev => {
      const newState = !prev
      setTimeout(() => {
        calendarRef.current?.updateSize?.()
      }, 0)
      return newState
    })
  }

  const handleBackClick = (event: React.MouseEvent): void => {
    event.stopPropagation()
    event.preventDefault()
    dispatch(setView('calendar'))
    dispatch(clearSearch())
  }

  if (openEventSearch) {
    return (
      <header className="menubar menubar--mobile">
        <IconButton
          size="xsmall"
          onClick={e => {
            setOpenEventSearch(false)
            handleBackClick(e)
          }}
          aria-label={t('common.back')}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon fontSize="inherit" />
        </IconButton>
        <MobileSearchBar />
      </header>
    )
  }

  const toggleDatePickerTitle = openDatePicker
    ? t('menubar.hideDatePicker')
    : t('menubar.showDatePicker')

  return (
    <>
      <header className="menubar menubar--mobile">
        {view === 'settings' ? (
          <>
            <IconButton
              size="xsmall"
              onClick={handleBackClick}
              aria-label={t('settings.back')}
              className="back-button"
            >
              <ArrowBackIcon />
            </IconButton>

            <Typography variant="h3" component="h1" sx={{ width: '100%' }}>
              {t('menubar.settings')}
            </Typography>
          </>
        ) : (
          <>
            <div className="left-menu">
              <IconButton
                size="xsmall"
                onClick={onOpenSidebar}
                aria-label={t('menubar.toggleSidebar')}
                sx={{ mr: isNarrow ? 0 : 1 }}
              >
                <MenuIcon />
              </IconButton>
              <div className="menu-items">
                <SmallNavigationControls
                  currentView={currentView}
                  onNavigate={handleNavigation}
                  compact={isNarrow}
                />
              </div>
              <div className="menu-items date-title">
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center' }}
                  className="current-date-time"
                >
                  <Typography
                    ref={titleRef}
                    sx={{
                      minWidth: 0,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      // the short label breaks its lines itself
                      whiteSpace: 'pre-line'
                    }}
                    onClick={onToggleDatePicker}
                  >
                    {showsShortLabel ? shortDateLabel : dateLabel}
                  </Typography>
                  <Tooltip title={toggleDatePickerTitle}>
                    <IconButton
                      size="small"
                      // narrow phones: leave the title room for "2026"
                      sx={{ flexShrink: 0, ...(isNarrow && { px: 0.5 }) }}
                      onClick={onToggleDatePicker}
                      aria-label={toggleDatePickerTitle}
                      aria-expanded={openDatePicker}
                    >
                      {openDatePicker ? (
                        <ArrowDropUpIcon />
                      ) : (
                        <ArrowDropDownIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </div>
            </div>
            <div className="right-menu">
              <div className="search-container">
                <IconButton
                  size="xsmall"
                  sx={{ mr: isNarrow ? 0 : 1 }}
                  onClick={() => {
                    setOpenDatePicker(false)
                    dispatch(setView('search'))
                    setOpenEventSearch(true)
                  }}
                  aria-label={t('common.search')}
                >
                  <SearchIcon />
                </IconButton>
              </div>
            </div>
          </>
        )}
      </header>

      {openDatePicker ? (
        <DatePickerMobile
          calendarRef={calendarRef}
          currentDate={currentDate}
          onDateChange={onDateChange}
          onCloseDatePicker={() => setOpenDatePicker(false)}
        />
      ) : null}
    </>
  )
}
