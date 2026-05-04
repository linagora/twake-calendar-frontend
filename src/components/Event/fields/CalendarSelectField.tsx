import { Calendar } from '@/features/Calendars/CalendarTypes'
import { defaultColors } from '@/utils/defaultColors'
import { makeDisplayName } from '@/utils/makeDisplayName'
import { renameDefault } from '@/utils/renameDefault'
import {
  Box,
  Divider,
  FormControl,
  Select,
  SelectChangeEvent,
  Typography
} from '@linagora/twake-mui'
import SquareRoundedIcon from '@mui/icons-material/SquareRounded'
import React, { useEffect, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { CalendarItemList } from '../../Calendar/CalendarItemList'
import { OwnerCaption } from '../../Calendar/OwnerCaption'
import { FieldWithLabel } from '../components/FieldWithLabel'
import { SectionPreviewRow } from '../components/SectionPreviewRow'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'

export interface CalendarSelectFieldProps {
  calendarid: string
  setCalendarid: (value: string) => void
  userPersonalCalendars: Calendar[]
  showMore: boolean
  /** Optional callback for additional logic on change (e.g. UpdateModal tracks newCalId) */
  onCalendarChange?: (newCalendarId: string) => void
}

const CalendarSelectFieldCollapsed: React.FC<{
  calendarid: string
  userPersonalCalendars: Calendar[]
  selectedCalendar: Calendar | undefined
  selectedOwnerDisplayName: string
  isSelectedDelegated: boolean
  setHasClickedCalendarSection: (value: boolean) => void
}> = ({
  calendarid,
  userPersonalCalendars,
  selectedCalendar,
  selectedOwnerDisplayName,
  isSelectedDelegated,
  setHasClickedCalendarSection
}) => {
  const { t } = useI18n()

  return (
    <SectionPreviewRow
      icon={
        <SquareRoundedIcon
          sx={{
            color:
              userPersonalCalendars.find(cal => cal.id === calendarid)?.color
                ?.light ?? defaultColors[0].light,
            width: 24,
            height: 24
          }}
        />
      }
      onClick={() => setHasClickedCalendarSection(true)}
    >
      {selectedCalendar?.name ? (
        <Box style={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
            {renameDefault(
              selectedCalendar.name,
              selectedOwnerDisplayName,
              t,
              !isSelectedDelegated
            )}
          </Typography>
          <OwnerCaption
            showCaption={
              isSelectedDelegated && selectedCalendar.name !== '#default'
            }
            ownerDisplayName={selectedOwnerDisplayName}
          />
        </Box>
      ) : (
        t('event.form.calendar')
      )}
    </SectionPreviewRow>
  )
}

const CalendarSelectFieldExpanded: React.FC<{
  calendarid: string
  setCalendarid: (value: string) => void
  userPersonalCalendars: Calendar[]
  calendarSelectOpen: boolean
  setCalendarSelectOpen: (value: boolean) => void
  onCalendarChange?: (newCalendarId: string) => void
}> = ({
  calendarid,
  setCalendarid,
  userPersonalCalendars,
  calendarSelectOpen,
  setCalendarSelectOpen,
  onCalendarChange
}) => {
  const { t } = useI18n()

  const delegatedCalendars = userPersonalCalendars.filter(cal => cal.delegated)
  const personalCalendars = userPersonalCalendars.filter(cal => !cal.delegated)

  const handleCalendarChange = (newCalendarId: string): void => {
    setCalendarid(newCalendarId)
    onCalendarChange?.(newCalendarId)
  }

  return (
    <FormControl fullWidth margin="dense" size="small">
      <Select
        value={calendarid ?? ''}
        label=""
        SelectDisplayProps={{ 'aria-label': t('event.form.calendar') }}
        displayEmpty
        open={calendarSelectOpen}
        onOpen={() => setCalendarSelectOpen(true)}
        onClose={() => setCalendarSelectOpen(false)}
        onChange={(e: SelectChangeEvent) =>
          handleCalendarChange(e.target.value)
        }
      >
        {CalendarItemList(personalCalendars)}
        {delegatedCalendars.length > 0 && personalCalendars.length > 0 && (
          <Divider component="li" />
        )}
        {CalendarItemList(delegatedCalendars)}
      </Select>
    </FormControl>
  )
}

export const CalendarSelectField: React.FC<CalendarSelectFieldProps> = ({
  calendarid,
  setCalendarid,
  userPersonalCalendars,
  showMore,
  onCalendarChange
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  // Local UI state
  const [hasClickedCalendarSection, setHasClickedCalendarSection] =
    useState(false)
  const [calendarSelectOpen, setCalendarSelectOpen] = useState(false)

  // Auto-open the Select once it mounts after clicking the preview row
  useEffect(() => {
    const openSelectAfterClick = (): void => {
      if (hasClickedCalendarSection) {
        setCalendarSelectOpen(true)
      }
    }

    openSelectAfterClick()
  }, [hasClickedCalendarSection])

  const selectedCalendar = userPersonalCalendars.find(
    cal => cal.id === calendarid
  )
  const selectedOwnerDisplayName = selectedCalendar
    ? (makeDisplayName(selectedCalendar) ?? '')
    : ''
  const isSelectedDelegated = !!selectedCalendar?.delegated

  const isCollapsed = !showMore && !hasClickedCalendarSection

  return (
    <FieldWithLabel
      label={isCollapsed ? '' : t('event.form.calendar')}
      isExpanded={!isMobile && showMore}
    >
      {isCollapsed ? (
        <CalendarSelectFieldCollapsed
          calendarid={calendarid}
          userPersonalCalendars={userPersonalCalendars}
          setHasClickedCalendarSection={setHasClickedCalendarSection}
          selectedCalendar={selectedCalendar}
          selectedOwnerDisplayName={selectedOwnerDisplayName}
          isSelectedDelegated={isSelectedDelegated}
        />
      ) : (
        <CalendarSelectFieldExpanded
          calendarid={calendarid}
          setCalendarid={setCalendarid}
          userPersonalCalendars={userPersonalCalendars}
          calendarSelectOpen={calendarSelectOpen}
          setCalendarSelectOpen={setCalendarSelectOpen}
          onCalendarChange={onCalendarChange}
        />
      )}
    </FieldWithLabel>
  )
}
