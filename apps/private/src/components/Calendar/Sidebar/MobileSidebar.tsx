import {
  Drawer,
  Box,
  useTheme,
  ListItemIcon,
  ListItemButton
} from '@linagora/twake-mui'
import { ListItemText } from '@common/ds/ListItemText/ListItemText'
import { CalendarSidebarProps } from './SideBar'
import { SidebarCommonContent } from './SidebarCommonContent'
import { ViewSwitcher } from './ViewSwitcher'
import { useI18n } from 'twake-i18n'
import { useAppDispatch } from '@common/app/hooks'
import { setView } from '@common/features/Settings/SettingsSlice'
import { setIsMobileSearchOpen } from '@common/features/Calendars/CalendarSlice'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'

export const MobileSidebar: React.FC<CalendarSidebarProps> = ({
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
  const dispatch = useAppDispatch()

  const openSearch = (): void => {
    dispatch(setIsMobileSearchOpen(true))
  }

  const openSettings = (): void => {
    dispatch(setView('settings'))
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
      <ViewSwitcher
        onClose={onClose}
        onViewChange={onViewChange}
        currentView={currentView}
      />

      <SidebarCommonContent
        onCreateEvent={onCreateEvent}
        tempUsers={tempUsers}
        setTempUsers={setTempUsers}
        selectedCalendars={selectedCalendars}
        setSelectedCalendars={setSelectedCalendars}
        openSearchOnMobile={openSearch}
      />

      <Box sx={{ marginTop: 1 }}>
        <ListItemButton sx={{ padding: 0 }} onClick={openSettings}>
          <ListItemIcon sx={{ minWidth: 'unset' }}>
            <SettingsOutlinedIcon
              sx={{
                marginRight: 1,
                color: theme.vars.palette.text.primary,
                fontSize: 20
              }}
            />
          </ListItemIcon>
          <ListItemText
            primary={t('menubar.settings')}
            slotProps={{
              primary: {
                sx: {
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '20px'
                }
              }
            }}
          />
        </ListItemButton>
      </Box>
    </Drawer>
  )
}
