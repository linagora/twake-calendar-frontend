import { CalendarApi } from '@fullcalendar/core'
import { IconButton, Stack } from '@linagora/twake-mui'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp'
import TodayIcon from '@mui/icons-material/Today'
import React, { useState } from 'react'
import { useI18n } from 'twake-i18n'
import SearchBar from '../EventSearchBar'
import '../Menubar.styl'
import { DatePickerMobile } from './DatePickerMobile'
import { Typography } from '@mui/material'

export type MenubarMobileProps = {
  calendarRef: React.RefObject<CalendarApi | null>
  currentDate: Date
  onDateChange?: (date: Date) => void
  handleNavigation: (action: 'prev' | 'next' | 'today') => void
}

export const MenubarMobile: React.FC<MenubarMobileProps> = ({
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
            <div className="navigation-controls">
              <Stack direction="row">
                <IconButton onClick={() => handleNavigation('prev')}>
                  <ChevronLeftIcon sx={{ height: 20 }} />
                </IconButton>
                <IconButton
                  color="primary"
                  sx={{
                    border: '1px solid',
                    borderRadius: '12px'
                  }}
                  onClick={() => handleNavigation('today')}
                >
                  <TodayIcon />
                </IconButton>
                <IconButton onClick={() => handleNavigation('next')}>
                  <ChevronRightIcon sx={{ height: 20 }} />
                </IconButton>
              </Stack>
            </div>
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
