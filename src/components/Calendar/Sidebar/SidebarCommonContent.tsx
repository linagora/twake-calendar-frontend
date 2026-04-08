import { Box } from '@linagora/twake-mui'
import CalendarSelection from '../CalendarSelection'
import { TempCalendarsInput } from '../TempCalendarsInput'
import { CalendarSidebarProps } from './SideBar'

export const SidebarCommonContent: React.FC<
  Pick<
    CalendarSidebarProps,
    | 'onCreateEvent'
    | 'tempUsers'
    | 'setTempUsers'
    | 'selectedCalendars'
    | 'setSelectedCalendars'
  > & { openSearchOnMobile?: () => void }
> = ({
  onCreateEvent,
  tempUsers,
  setTempUsers,
  selectedCalendars,
  setSelectedCalendars,
  openSearchOnMobile
}) => {
  return (
    <>
      <Box sx={{ mb: 3, mt: 2 }}>
        <TempCalendarsInput
          tempUsers={tempUsers}
          setTempUsers={setTempUsers}
          handleToggleEventPreview={onCreateEvent}
          onOpenSearchOnMobile={openSearchOnMobile}
        />
      </Box>
      <Box className="calendarList">
        <CalendarSelection
          selectedCalendars={selectedCalendars}
          setSelectedCalendars={setSelectedCalendars}
        />
      </Box>
    </>
  )
}
