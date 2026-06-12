import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { clearSearch } from '@common/features/Search/SearchSlice'
import { setView } from '@common/features/Settings/SettingsSlice'
import { CalendarApi } from '@fullcalendar/core'
import { IconButton, Stack, Typography } from '@linagora/twake-mui'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/Search'
import React, { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { Tooltip } from '../Tooltip'
import { DatePickerMobile } from './components/DatePickerMobile'
import { SmallNavigationControls } from './components/SmallNavigationControls'
import './Menubar.styl'
import MobileSearchBar from './MobileEventSearchBar'

export interface MobileMenubarProps {
  calendarRef: React.RefObject<CalendarApi | null>
  currentDate: Date
  onDateChange?: (date: Date) => void
  handleNavigation: (action: 'prev' | 'next' | 'today') => void
  onOpenSidebar: () => void
}

export const MobileMenubar: React.FC<MobileMenubarProps> = ({
  calendarRef,
  currentDate,
  onDateChange,
  handleNavigation,
  onOpenSidebar
}) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()

  const view = useAppSelector(state => state.settings.view)

  const [openDatePicker, setOpenDatePicker] = useState(false)
  const [openEventSearch, setOpenEventSearch] = useState(false)

  // Use i18n for month names instead of date-fns
  const monthIndex = currentDate.getMonth()
  const year = currentDate.getFullYear()
  const monthName = t(`months.standalone.${monthIndex}`)
  const dateLabel = `${monthName} ${year}`

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
              onClick={handleBackClick}
              aria-label={t('settings.back')}
              className="back-button"
            >
              <ArrowBackIcon />
            </IconButton>

            <Typography variant="h3" sx={{ width: '100%' }}>
              {t('menubar.settings')}
            </Typography>
          </>
        ) : (
          <>
            <div className="left-menu">
              <IconButton
                onClick={onOpenSidebar}
                aria-label={t('menubar.toggleSidebar')}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <div className="menu-items">
                <SmallNavigationControls onNavigate={handleNavigation} />
              </div>
              <div className="menu-items">
                <Stack direction="row" className="current-date-time">
                  <Typography
                    sx={{ lineHeight: 'unset' }}
                    onClick={onToggleDatePicker}
                  >
                    {dateLabel}
                  </Typography>
                  <Tooltip title={toggleDatePickerTitle}>
                    <IconButton
                      size="small"
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
                  sx={{ mr: 1 }}
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
