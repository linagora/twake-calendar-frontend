import { useMemo } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { resolveTimezone } from '@common/utils/timezone'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import { useEventOrganizer } from '@common/features/Events/useEventOrganizer'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { CalendarEvent } from '@common/types/EventsTypes'
import { DateSelectInfo } from '@fullcalendar/react'
import {
  buildFromExistingEvent,
  buildFromSelectedRange,
  buildDefaultNewEvent
} from '@common/components/Event/utils/eventInitialValuesHelpers'
import { useDefaultCalendarId } from '@common/features/Calendars/hooks/useDefaultCalendarId'

export interface UseBuildInitialValuesParams {
  event?: CalendarEvent | null
  selectedRange?: DateSelectInfo | null
  calId?: string
}

const isValidToInitBySelectedRange = (
  selectedRange: DateSelectInfo | null | undefined,
  event: CalendarEvent | null | undefined
): boolean => {
  if (!selectedRange) return false
  if (!selectedRange.start || !selectedRange.end) return false

  const isEventNew = !event?.uid

  return isEventNew || selectedRange.allDay
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
    const base: Partial<EventFormValues> = {
      timezone: resolvedCalendarTimezone,
      calendarid: defaultCalendarId
    }

    let defaultEvent = buildDefaultNewEvent(base)

    if (event) {
      defaultEvent = {
        ...defaultEvent,
        ...buildFromExistingEvent({
          event,
          resolvedCalendarTimezone,
          calList,
          userId,
          defaultCalendarId,
          organizer,
          calId
        })
      }
    }

    const isInitFromSelectedRange = isValidToInitBySelectedRange(
      selectedRange,
      event
    )
    if (isInitFromSelectedRange) {
      return {
        ...defaultEvent,
        ...buildFromSelectedRange(selectedRange ?? ({} as DateSelectInfo), base)
      }
    }

    return defaultEvent
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
