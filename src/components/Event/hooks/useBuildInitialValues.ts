import { useMemo } from 'react'
import { useAppSelector } from '@/app/hooks'
import { resolveTimezone } from '@/utils/timezone'
import { browserDefaultTimeZone } from '@/utils/timezone'
import { useEventOrganizer } from '@/features/Events/useEventOrganizer'
import { EventFormValues } from '@/components/Event/EventFormFields.types'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { DateSelectArg } from '@fullcalendar/core'
import {
  buildFromExistingEvent,
  buildFromSelectedRange,
  buildDefaultNewEvent
} from '@/components/Event/utils/eventInitialValuesHelpers'
import { useDefaultCalendarId } from '@/features/Calendars/hooks/useDefaultCalendarId'

export interface UseBuildInitialValuesParams {
  event?: CalendarEvent | null
  selectedRange?: DateSelectArg | null
  calId?: string
}

export const useBuildInitialValues = ({
  event,
  selectedRange,
  calId
}: UseBuildInitialValuesParams): Partial<EventFormValues> => {
  const calList = useAppSelector(state => state.calendars.list)
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const calendarTimezone = useAppSelector(state => state.settings.timeZone)
  const userOrganizer = useAppSelector(state => state.user.organiserData)

  const resolvedCalendarTimezone = useMemo(() => {
    const tz = calendarTimezone || browserDefaultTimeZone
    return resolveTimezone(tz)
  }, [calendarTimezone])

  const defaultCalendarId = useDefaultCalendarId({
    calId,
    calList,
    userId
  })

  const { organizer } = useEventOrganizer({
    calendarid: defaultCalendarId,
    calList,
    userOrganizer
  })

  return useMemo(() => {
    if (event) {
      return buildFromExistingEvent({
        event,
        resolvedCalendarTimezone,
        calList,
        userId,
        defaultCalendarId,
        organizer,
        calId
      })
    }

    const base: Partial<EventFormValues> = {
      timezone: resolvedCalendarTimezone,
      calendarid: defaultCalendarId
    }

    if (selectedRange?.start && selectedRange?.end) {
      return buildFromSelectedRange(selectedRange, base)
    }

    return buildDefaultNewEvent(base)
  }, [
    event,
    selectedRange,
    calId,
    calList,
    userId,
    resolvedCalendarTimezone,
    defaultCalendarId,
    organizer
  ])
}
