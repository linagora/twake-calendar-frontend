import { Drawer } from '@linagora/twake-mui'
import { CalendarSidebarProps } from './SideBar'
import { SidebarCommonContent } from './SidebarCommonContent'
import { ViewSwitcher } from './ViewSwitcher'
import { useI18n } from 'twake-i18n'
import { HighContrastSwitch } from '@common/features/Settings/Accessibility/HighContrastSwitch'

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
      slotProps={{
        paper: { className: 'sidebar', 'aria-label': t('a11y.sidebar') }
      }}
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
      />
      {/* R-29: the accessible version within one step of every view */}
      <HighContrastSwitch sx={{ mt: 'auto', pt: 2 }} />
    </Drawer>
  )
}
