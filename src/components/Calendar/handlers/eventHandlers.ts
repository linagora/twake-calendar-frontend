import { AppDispatch } from '@/app/store'
import { User } from '@/components/Attendees/types'
import { formatLocalDateTime } from '@/components/Event/utils/dateTimeFormatters'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import {
  getEventAsync,
  putEventAsync,
  updateEventInstanceAsync,
  updateSeriesAsync
} from '@/features/Calendars/services'
import { getEvent } from '@/features/Events/EventApi'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { updateAttendeesAfterTimeChange } from '@/features/Events/updateEventHelpers/updateAttendeesAfterTimeChange'
import { userAttendee } from '@/features/User/models/attendee'
import {
  AttendeeOptions,
  createAttendee
} from '@/features/User/models/attendee.mapper'
import { getDeltaInMilliseconds } from '@/utils/dateUtils'
import {
  CalendarApi,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventApi
} from '@fullcalendar/core'
import { EventResizeDoneArg } from '@fullcalendar/interaction'

export interface EventHandlersProps {
  setSelectedRange: (range: DateSelectArg | null) => void
  setAnchorEl: (el: HTMLElement | null) => void
  calendarRef: React.RefObject<CalendarApi | null>
  dispatch: AppDispatch
  setOpenEventDisplay: (open: boolean) => void
  setEventDisplayedId: (id: string) => void
  setEventDisplayedCalId: (id: string) => void
  setEventDisplayedTemp: (temp: boolean) => void
  calendars: Record<string, Calendar>
  setSelectedEvent: (event: CalendarEvent) => void
  setAfterChoiceFunc: (
    func: ((type: 'solo' | 'all' | undefined) => void) | undefined
  ) => void
  setOpenEditModePopup: (open: string) => void
  tempUsers: User[]
  setTempEvent: (event: CalendarEvent) => void
  timezone: string
}

export const createEventHandlers = (
  props: EventHandlersProps
): {
  handleDateSelect: (selectInfo: DateSelectArg | null) => void
  handleClosePopover: () => void
  handleCloseEventDisplay: () => void
  handleEventClick: (info: EventClickArg) => void
  handleEventAllow: () => boolean
  handleEventDrop: (arg: EventDropArg) => Promise<void>
  handleEventResize: (arg: EventResizeDoneArg) => Promise<void>
} => {
  const {
    setSelectedRange,
    setAnchorEl,
    calendarRef,
    dispatch,
    setOpenEventDisplay,
    setEventDisplayedId,
    setEventDisplayedCalId,
    setEventDisplayedTemp,
    calendars,
    setSelectedEvent,
    setAfterChoiceFunc,
    setOpenEditModePopup,
    tempUsers,
    setTempEvent,
    timezone
  } = props

  const handleDateSelect = (selectInfo: DateSelectArg | null): void => {
    setSelectedRange(selectInfo)
    if (tempUsers) {
      setTempEvent(buildInitialTempEvent(selectInfo, timezone, tempUsers))
    }
    setAnchorEl(document.body)
  }

  const handleClosePopover = (): void => {
    calendarRef.current?.unselect()
    setAnchorEl(null)
    setSelectedRange(null)
  }

  const handleCloseEventDisplay = (): void => {
    setOpenEventDisplay(false)
  }

  const openEventViaUrl = (urlStr: string): void => {
    try {
      const url = new URL(urlStr)
      if (['http:', 'https:'].includes(url.protocol)) {
        window.open(url)
      }
    } catch (error) {
      console.error('Could not open event: ', error)
    }
  }

  const handleEventClick = (info: EventClickArg): void => {
    info.jsEvent.preventDefault()

    if (info.event.url) {
      openEventViaUrl(info.event.url)
    } else {
      setOpenEventDisplay(true)
      if (
        calendars[info.event.extendedProps.calId as string] &&
        calendars[info.event.extendedProps.calId as string].events[
          info.event.extendedProps.uid as string
        ]
      ) {
        void dispatch(
          getEventAsync(
            calendars[info.event.extendedProps.calId as string].events[
              info.event.extendedProps.uid as string
            ]
          )
        )
      }

      setEventDisplayedId(info.event.extendedProps.uid as string)
      setEventDisplayedCalId(info.event.extendedProps.calId as string)
      setEventDisplayedTemp(info.event._def.extendedProps.temp as boolean)
    }
  }

  const handleEventAllow = (): boolean => {
    return true
  }

  const mapTempUserToAttendee = (user: User): userAttendee => {
    const attendeeOption: AttendeeOptions = {
      cal_address: user.email,
      cn: user.displayName,
      rsvp: 'TRUE'
    }

    if (user.objectType === 'resource') {
      attendeeOption.cutype = 'RESOURCE'
    }
    return createAttendee(attendeeOption)
  }

  const buildInitialTempEvent = (
    selectInfo: DateSelectArg | null,
    tz: string,
    users: User[]
  ): CalendarEvent => {
    return {
      start: selectInfo?.start ? formatLocalDateTime(selectInfo.start, tz) : '',
      end: selectInfo?.end ? formatLocalDateTime(selectInfo.end, tz) : '',
      allday: selectInfo?.allDay ?? false,
      attendee: users.map(mapTempUserToAttendee)
    } as CalendarEvent
  }

  const getEventAndCalendar = (
    eventApi: EventApi
  ): { event: CalendarEvent; calendar: Calendar } | null => {
    if (!eventApi || !eventApi.extendedProps) {
      return null
    }

    const calId = eventApi.extendedProps.calId as string
    const uid = eventApi.extendedProps.uid as string

    const calendar = calendars[calId]
    const event = calendar?.events[uid]

    if (!event || !calendar) return null

    return { event, calendar }
  }

  const processTimeChange = async (
    event: CalendarEvent,
    calendar: Calendar,
    computedNewStart: Date,
    computedNewEnd: Date
  ): Promise<void> => {
    const isRecurring = event.uid.includes('/')
    const newEvent = updateAttendeesAfterTimeChange(
      {
        ...event,
        start: computedNewStart.toISOString(),
        end: computedNewEnd.toISOString(),
        sequence: (event.sequence ?? 1) + 1
      } as CalendarEvent,
      true
    )

    if (isRecurring) {
      setSelectedEvent(event)
      setOpenEditModePopup('edit')
      setAfterChoiceFunc(
        () =>
          async (typeOfAction: 'solo' | 'all' | undefined): Promise<void> => {
            if (typeOfAction === 'solo') {
              await dispatch(
                updateEventInstanceAsync({ cal: calendar, event: newEvent })
              )
            } else if (typeOfAction === 'all') {
              const master = await getEvent(newEvent, true)

              await dispatch(
                updateSeriesAsync({
                  cal: calendar,
                  event: {
                    ...master,
                    start: computedNewStart.toISOString(),
                    end: computedNewEnd.toISOString(),
                    sequence: (master.sequence ?? 1) + 1
                  }
                })
              )
            }
          }
      )
    } else {
      await dispatch(putEventAsync({ cal: calendar, newEvent }))
    }
  }

  const handleEventDrop = async (arg: EventDropArg): Promise<void> => {
    const data = getEventAndCalendar(arg.event)
    if (!data) return
    const { event, calendar } = data

    const totalDeltaMs = getDeltaInMilliseconds(arg.delta)
    const originalStart = new Date(event.start)
    const computedNewStart = new Date(originalStart.getTime() + totalDeltaMs)
    const originalEnd = new Date(event.end ?? '')
    const computedNewEnd = new Date(originalEnd.getTime() + totalDeltaMs)

    await processTimeChange(event, calendar, computedNewStart, computedNewEnd)
  }

  const handleEventResize = async (arg: EventResizeDoneArg): Promise<void> => {
    const data = getEventAndCalendar(arg.event)
    if (!data) return
    const { event, calendar } = data

    const originalStart = new Date(event.start)
    const computedNewStart = new Date(
      originalStart.getTime() + getDeltaInMilliseconds(arg.startDelta)
    )
    const originalEnd = new Date(event.end ?? '')
    const computedNewEnd = new Date(
      originalEnd.getTime() + getDeltaInMilliseconds(arg.endDelta)
    )

    await processTimeChange(event, calendar, computedNewStart, computedNewEnd)
  }

  return {
    handleDateSelect,
    handleClosePopover,
    handleCloseEventDisplay,
    handleEventClick,
    handleEventAllow,
    handleEventDrop,
    handleEventResize
  }
}
