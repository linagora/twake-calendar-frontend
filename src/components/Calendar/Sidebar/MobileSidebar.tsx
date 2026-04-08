import { Drawer, IconButton, Box } from '@linagora/twake-mui'
import { CalendarSidebarProps } from './SideBar'
import { SidebarCommonContent } from './SidebarCommonContent'
import { ViewSwitcher } from './ViewSwitcher'
import { MainTitle } from '@/components/Menubar/MainTitle'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { useI18n } from 'twake-i18n'
import { AppListMenu } from '@/components/Menubar/AppListMenu'
import { UserMenu } from '@/components/Menubar/UserMenu'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useUtilMenus } from '../hooks/useUtilMenus'
import { setIsMobileSearchOpen } from '@/features/Calendars/CalendarSlice'

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
  const user = useAppSelector(state => state.user.userData)
  const dispatch = useAppDispatch()

  const {
    anchorEl,
    supportLink,
    userMenuAnchorEl,
    handleAppMenuOpen,
    handleAppMenuClose,
    handleUserMenuOpen,
    handleUserMenuClose,
    handleSettingsClick,
    handleLogoutClick
  } = useUtilMenus()

  const openSearch = (): void => {
    dispatch(setIsMobileSearchOpen(true))
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
          display="flex"
          flexDirection="row"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <MainTitle
            calendarRef={calendarRef}
            currentView={currentView}
            onViewChange={onViewChange}
            onDateChange={onDateChange}
          />

          <Box display="flex" alignItems="center">
            {supportLink && (
              <IconButton
                component="a"
                href={supportLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginRight: 4 }}
                aria-label={t('menubar.help')}
                title={t('menubar.help')}
              >
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            )}

            <AppListMenu
              anchorEl={anchorEl}
              onAppMenuOpen={handleAppMenuOpen}
              onAppMenuClose={handleAppMenuClose}
              iconSize="small"
            />

            <UserMenu
              anchorEl={userMenuAnchorEl}
              onClose={handleUserMenuClose}
              onSettingsClick={handleSettingsClick}
              onLogoutClick={() => void handleLogoutClick()}
              onUserMenuOpen={handleUserMenuOpen}
              isIframe={isIframe}
              user={user}
              size="s"
            />
          </Box>
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
    </Drawer>
  )
}
