import { Calendar } from '@common/types/CalendarTypes'
import { Box, Typography } from '@linagora/twake-mui'
import React from 'react'
import { formatEventChipTitle } from '../Calendar/utils/calendarUtils'
import { EventTimeSubtitle } from '../EventPreview/EventTimeSubtitle'
import { EventFormFieldsSpecific } from './components/EventFormFieldsSpecific'
import { EventFormValues } from './EventFormFields.types'
import { CalendarSelectField } from './fields/CalendarSelectField'

export function EventFormFieldPersonalSettings({
  v,
  t,
  typeOfAction,
  setCalendarid,
  userPersonalCalendars,
  showMore,
  setAlarm,
  setBusy,
  setEventClass,
  isOrganizer
}: {
  v: EventFormValues
  t: (key: string, options?: Record<string, any>) => string
  typeOfAction: string | undefined
  setCalendarid: (v: string) => void
  userPersonalCalendars: Calendar[]
  showMore: boolean
  setAlarm: (v: string) => void
  setBusy: (v: string) => void
  setEventClass: (v: EventFormValues['eventClass']) => void
  isOrganizer: boolean
}): React.ReactNode {
  return (
    <React.Fragment>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Typography
          variant="h3"
          sx={{
            wordBreak: 'break-word'
          }}
        >
          {formatEventChipTitle(v, t)}
        </Typography>
      </Box>
      <EventTimeSubtitle event={v} timezone={v.timezone} />

      {typeOfAction !== 'solo' && (
        <CalendarSelectField
          calendarid={v.calendarid}
          setCalendarid={setCalendarid}
          userPersonalCalendars={userPersonalCalendars}
          showMore={showMore}
          defaultExpanded
        />
      )}
      <EventFormFieldsSpecific
        alarm={v.alarm}
        setAlarm={setAlarm}
        busy={v.busy}
        setBusy={setBusy}
        eventClass={v.eventClass}
        setEventClass={setEventClass}
        showMore={showMore}
        isOrganizer={isOrganizer}
      />
    </React.Fragment>
  )
}
