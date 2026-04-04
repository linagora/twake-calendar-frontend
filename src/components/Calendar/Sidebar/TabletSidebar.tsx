import {
  Drawer,
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
import { SidebarCommonContent } from './SidebarCommonContent'

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

export const TabletSidebar: React.FC<CalendarSidebarProps> = ({
  open,
  onClose,
  onViewChange,
  onCreateEvent,
  tempUsers,
  setTempUsers,
  selectedCalendars,
  setSelectedCalendars,
  currentView
}) => {
  const { t } = useI18n()
  const theme = useTheme()

  const changeViewAndClose = (view: string): void => {
    onViewChange(view)
    onClose()
  }

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      className="sidebar"
      sx={{
        [`& .MuiDrawer-paper`]: {
          paddingTop: 2,
          paddingBottom: 3,
          paddingLeft: 3,
          paddingRight: 2,
          width: '270px',
          marginTop: 0
        }
      }}
      slotProps={{ paper: { className: 'sidebar' } }}
    >
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

      <SidebarCommonContent
        onCreateEvent={onCreateEvent}
        tempUsers={tempUsers}
        setTempUsers={setTempUsers}
        selectedCalendars={selectedCalendars}
        setSelectedCalendars={setSelectedCalendars}
      />
    </Drawer>
  )
}
