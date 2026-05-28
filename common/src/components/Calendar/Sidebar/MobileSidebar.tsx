import {
  Drawer,
  Box,
  useTheme,
  ListItemIcon,
  ListItemText,
  ListItemButton
} from '@linagora/twake-mui'
import { CalendarSidebarProps } from './SideBar'
import { SidebarCommonContent } from './SidebarCommonContent'
import { ViewSwitcher } from './ViewSwitcher'
import { MainTitle } from '@common/components/Menubar/MainTitle'
import { useI18n } from 'twake-i18n'
import { useAppDispatch } from '@common/app/hooks'
import { useUtilMenus } from '@common/components/Calendar/hooks/useUtilMenus'
import { setIsMobileSearchOpen } from '@common/features/Calendars/CalendarSlice'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { UtilButtons } from './UtilButtons'

export const MobileSidebar: React.FC<CalendarSidebarProps> = ({
  open,
  onClose,
  onViewChange,
  onCreateEvent,
  tempUsers,
  setTempUsers,
  selectedCalendars,
  setSelectedCalendars,
  currentView,
  isIframe,
  calendarRef,
  onDateChange
}) => {
  const { t } = useI18n()
  const theme = useTheme()
  const dispatch = useAppDispatch()

  const { handleSettingsClick } = useUtilMenus()

  const openSearch = (): void => {
    dispatch(setIsMobileSearchOpen(true))
  }

  const openSettings = (): void => {
    handleSettingsClick()
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
      {!isIframe && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            mb: 2
          }}
        >
          <MainTitle
            calendarRef={calendarRef}
            currentView={currentView}
            onViewChange={onViewChange}
            onDateChange={onDateChange}
          />

          <UtilButtons isIframe={isIframe} />
        </Box>
      )}

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
                color: theme.palette.grey.A700,
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
