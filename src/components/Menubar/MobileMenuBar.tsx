import { CalendarApi } from '@fullcalendar/core'
import { IconButton, Stack } from '@linagora/twake-mui'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp'
import React, { useState } from 'react'
import { useI18n } from 'twake-i18n'
import SearchBar from './EventSearchBar'
import './Menubar.styl'
import { DatePickerMobile } from './components/DatePickerMobile'
import { Typography } from '@mui/material'
import { SmallNavigationControls } from './components/SmallNavigationControls'

export type MobileMenubarProps = {
  calendarRef: React.RefObject<CalendarApi | null>
  currentDate: Date
  onDateChange?: (date: Date) => void
  handleNavigation: (action: 'prev' | 'next' | 'today') => void
}

export const MobileMenubar: React.FC<MobileMenubarProps> = ({
  calendarRef,
  currentDate,
  onDateChange,
  handleNavigation
}) => {
  const { t } = useI18n()

  const [openDatePicker, setOpenDatePicker] = useState(false)

  // Use i18n for month names instead of date-fns
  const monthIndex = currentDate.getMonth()
  const year = currentDate.getFullYear()
  const monthName = t(`months.standalone.${monthIndex}`)
  const dateLabel = `${monthName} ${year}`

  return (
    <>
      <header className="menubar">
        <div className="left-menu">
          <div className="menu-items">
            <SmallNavigationControls onNavigate={handleNavigation} />
          </div>
          <div className="menu-items">
            <Stack direction="row" className="current-date-time">
              <Typography
                sx={{ lineHeight: 'unset' }}
                onClick={() => setOpenDatePicker(prev => !prev)}
              >
                {dateLabel}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setOpenDatePicker(prev => !prev)}
                aria-label={
                  openDatePicker
                    ? t('menubar.hideDatePicker')
                    : t('menubar.showDatePicker')
                }
                title={
                  openDatePicker
                    ? t('menubar.hideDatePicker')
                    : t('menubar.showDatePicker')
                }
                aria-expanded={openDatePicker}
              >
                {openDatePicker ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
              </IconButton>
            </Stack>
          </div>
        </div>
        <div className="right-menu">
          <div className="search-container">
            <SearchBar />
          </div>
        </div>
      </header>

      {openDatePicker ? (
        <DatePickerMobile
          calendarRef={calendarRef}
          currentDate={currentDate}
          onDateChange={onDateChange}
        />
      ) : null}
    </>
  )
}
