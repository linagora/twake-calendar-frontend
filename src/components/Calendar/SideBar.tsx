import { CalendarApi } from '@fullcalendar/core'
import { Box, Button, Drawer, radius } from '@linagora/twake-mui'
import AddIcon from '@mui/icons-material/Add'
import CalendarViewDayOutlinedIcon from '@mui/icons-material/CalendarViewDayOutlined'
import CalendarViewMonthOutlinedIcon from '@mui/icons-material/CalendarViewMonthOutlined'
import CalendarViewWeekOutlinedIcon from '@mui/icons-material/CalendarViewWeekOutlined'
import { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useI18n } from 'twake-i18n'
import { User } from '../Attendees/PeopleSearch'
import { FieldWithLabel } from '../Event/components/FieldWithLabel'
import CalendarSelection from './CalendarSelection'
import { MiniCalendar } from './MiniCalendar'
import { TempCalendarsInput } from './TempCalendarsInput'

interface CalendarSidebarProps {
  isTablet: boolean
  open: boolean
  onClose: () => void
  calendarRef: MutableRefObject<CalendarApi | null>
  isIframe?: boolean
  onCreateEvent: () => void
  onViewChange: (view: string) => void
  selectedMiniDate: Date
  setSelectedMiniDate: (date: Date) => void
  selectedCalendars: string[]
  setSelectedCalendars: Dispatch<SetStateAction<string[]>>
  tempUsers: User[]
  setTempUsers: Dispatch<SetStateAction<User[]>>
}

export default function Sidebar({
  isTablet,
  open,
  onClose,
  calendarRef,
  isIframe,
  onCreateEvent,
  onViewChange,
  selectedMiniDate,
  setSelectedMiniDate,
  selectedCalendars,
  setSelectedCalendars,
  tempUsers,
  setTempUsers
}: CalendarSidebarProps) {
  const { t } = useI18n()

  return (
    <Drawer
      variant={isTablet ? 'temporary' : 'permanent'}
      open={isTablet ? open : true}
      onClose={onClose}
      className="sidebar"
      sx={{
        [`& .MuiDrawer-paper`]: {
          paddingTop: isTablet ? 2 : 0,
          paddingBottom: 3,
          paddingLeft: 3,
          paddingRight: 2,
          width: '270px',
          marginTop: isTablet ? 0 : '70px'
        },
        zIndex: isTablet ? 3000 : 5
      }}
      slotProps={{ paper: { className: 'sidebar' } }}
    >
      {!isTablet && (
        <>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: '#fff',
              paddingTop: isIframe ? '10px' : 3
            }}
          >
            <Button
              size="medium"
              variant="contained"
              fullWidth
              onClick={onCreateEvent}
              sx={{
                borderRadius: radius.lg,
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: 'normal'
              }}
            >
              <AddIcon sx={{ marginRight: 0.5, fontSize: '20px' }} />{' '}
              {t('event.createEvent')}
            </Button>
          </Box>
          <Box>
            <MiniCalendar
              calendarRef={calendarRef}
              selectedDate={selectedMiniDate}
              setSelectedMiniDate={setSelectedMiniDate}
            />
          </Box>
        </>
      )}

      {isTablet && (
        <FieldWithLabel label={t('sidebar.displayMode')} isExpanded={false}>
          <Button
            variant="text"
            onClick={() => onViewChange('timeGridDay')}
            startIcon={<CalendarViewDayOutlinedIcon />}
          >
            {t('menubar.views.day')}
          </Button>
          <Button
            variant="text"
            onClick={() => {
              onViewChange('timeGridWeek')
            }}
            startIcon={<CalendarViewWeekOutlinedIcon />}
          >
            {t('menubar.views.week')}
          </Button>
          <Button
            variant="text"
            onClick={() => onViewChange('dayGridMonth')}
            startIcon={<CalendarViewMonthOutlinedIcon />}
          >
            {t('menubar.views.month')}
          </Button>
        </FieldWithLabel>
      )}

      <Box sx={{ mb: 3, mt: 2 }}>
        <TempCalendarsInput
          tempUsers={tempUsers}
          setTempUsers={setTempUsers}
          handleToggleEventPreview={onCreateEvent}
        />
      </Box>

      <Box className="calendarList">
        <CalendarSelection
          selectedCalendars={selectedCalendars}
          setSelectedCalendars={setSelectedCalendars}
        />
      </Box>
    </Drawer>
  )
}
