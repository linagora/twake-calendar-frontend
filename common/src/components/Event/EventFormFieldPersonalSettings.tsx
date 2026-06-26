import { Calendar } from '@common/types/CalendarTypes'
import { Box, Typography } from '@linagora/twake-mui'
import React, { useCallback } from 'react'
import { Valarms } from '@common/types/Valarms'
import { VAlarm } from '@common/types/VAlarm'
import { formatEventChipTitle } from '../Calendar/utils/calendarUtils'
import { EventTimeSubtitle } from '../EventPreview/EventTimeSubtitle'
import { EventFormFieldsSpecific } from './components/EventFormFieldsSpecific'
import { EventFormValues } from './EventFormFields.types'
import { CalendarSelectField } from './fields/CalendarSelectField'
import { userAttendee } from '@common/features/User/models/attendee'

export function EventFormFieldPersonalSettings({
  v,
  t,
  typeOfAction,
  setCalendarid,
  userPersonalCalendars,
  showMore,
  setAlarms,
  setBusy,
  setEventClass,
  isOrganizer,
  user
}: {
  v: EventFormValues
  t: (key: string, options?: object) => string
  typeOfAction: string | undefined
  setCalendarid: (v: string) => void
  userPersonalCalendars: Calendar[]
  showMore: boolean
  setAlarms: (v: Valarms) => void
  setBusy: (v: string) => void
  setEventClass: (v: EventFormValues['eventClass']) => void
  isOrganizer: boolean
  user: userAttendee
}): React.ReactNode {
  const setAlarmsWithUser = useCallback(
    (alarms: Valarms) => {
      const alarmsWithUser = Valarms.fromList(
        alarms.getAlarms().map(alarm => {
          if (alarm.attendees && alarm.attendees.length > 0) {
            return alarm
          }
          return new VAlarm({
            trigger: alarm.trigger,
            action: alarm.action,
            attendees: [user],
            summary: alarm.summary,
            description: alarm.description
          })
        })
      )
      setAlarms(alarmsWithUser)
    },
    [setAlarms, user]
  )

  return (
    <React.Fragment>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
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
        alarms={v.alarms}
        setAlarms={setAlarmsWithUser}
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
