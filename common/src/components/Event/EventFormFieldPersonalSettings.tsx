import { useAppSelector } from '@common/app/hooks'
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
import { useI18n } from 'twake-i18n'
import moment from 'moment-timezone'
import { browserDefaultTimeZone } from '@common/utils/timezone'

// Form values hold wall-clock times in the event zone: turn them into
// instants so they can be displayed in the user's zone
function toDisplayedEvent(v: EventFormValues): EventFormValues {
  if (v.allday) return v
  const toInstant = (dateTime: string): string =>
    dateTime ? moment.tz(dateTime, v.timezone).toISOString() : dateTime
  return { ...v, start: toInstant(v.start), end: toInstant(v.end) }
}

export function EventFormFieldPersonalSettings({
  v,
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
  const { t } = useI18n()
  const userTimezone =
    useAppSelector(state => state.settings.timeZone) ?? browserDefaultTimeZone

  const setAlarmsWithUser = useCallback(
    (alarms: Valarms) => {
      // Guard: don't stamp alarms if user has no valid cal_address
      if (!user?.cal_address) {
        setAlarms(alarms)
        return
      }
      const alarmsWithUser = Valarms.fromList(
        alarms.getAlarms().map(alarm => {
          if (alarm.attendees && alarm.attendees.length > 0) {
            return alarm
          }
          return new VAlarm({
            uid: alarm.uid,
            trigger: alarm.trigger,
            triggerType: alarm.triggerType,
            triggerParams: alarm.triggerParams,
            action: alarm.action,
            attendees: [user],
            summary: alarm.summary,
            description: alarm.description,
            passthroughProps: alarm.passthroughProps
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
      <EventTimeSubtitle
        event={toDisplayedEvent(v)}
        timezone={v.allday ? v.timezone : userTimezone}
      />

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
