import React from 'react'
import {
  ListItemIcon,
  ListItemText,
  MenuItem,
  MenuList,
  useTheme
} from '@linagora/twake-mui'
import CalendarViewDayOutlinedIcon from '@mui/icons-material/CalendarViewDayOutlined'
import CalendarViewMonthOutlinedIcon from '@mui/icons-material/CalendarViewMonthOutlined'
import CalendarViewWeekOutlinedIcon from '@mui/icons-material/CalendarViewWeekOutlined'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from '../../Event/components/FieldWithLabel'
import { CALENDAR_VIEWS } from '../utils/constants'
import { CalendarSidebarProps } from './SideBar'

const VIEW_OPTIONS = [
  {
    label: 'menubar.views.day',
    value: CALENDAR_VIEWS.timeGridDay,
    icon: <CalendarViewDayOutlinedIcon />
  },
  {
    label: 'menubar.views.week',
    value: CALENDAR_VIEWS.timeGridWeek,
    icon: <CalendarViewWeekOutlinedIcon />
  },
  {
    label: 'menubar.views.month',
    value: CALENDAR_VIEWS.dayGridMonth,
    icon: <CalendarViewMonthOutlinedIcon />
  }
]

export const ViewSwitcher: React.FC<
  Pick<CalendarSidebarProps, 'onClose' | 'onViewChange' | 'currentView'>
> = ({ onClose, onViewChange, currentView }) => {
  const { t } = useI18n()
  const theme = useTheme()

  const changeViewAndClose = (view: string): void => {
    onViewChange(view)
    onClose()
  }

  return (
    <FieldWithLabel label={t('sidebar.displayMode')} isExpanded={false}>
      <MenuList>
        {VIEW_OPTIONS.map(option => {
          const isSelected = option.value === currentView
          return (
            <MenuItem
              key={option.value}
              selected={isSelected}
              onClick={() => changeViewAndClose(option.value)}
            >
              <ListItemIcon
                sx={{
                  color: isSelected
                    ? theme.palette.primary.main
                    : theme.palette.text.primary
                }}
              >
                {option.icon}
              </ListItemIcon>
              <ListItemText
                primary={t(option.label)}
                primaryTypographyProps={{
                  sx: {
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '20px',
                    color: isSelected
                      ? theme.palette.primary.main
                      : theme.palette.text.primary
                  }
                }}
              />
            </MenuItem>
          )
        })}
      </MenuList>
    </FieldWithLabel>
  )
}
