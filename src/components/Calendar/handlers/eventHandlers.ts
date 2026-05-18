import moment from 'moment-timezone'
import { AppDispatch } from '@/app/store'
import { User } from '@/components/Attendees/types'
import { formatLocalDateTime } from '@/components/Event/utils/dateTimeFormatters'
import { DEFAULT_FORM_VALUES } from '@/components/Event/EventFormFields.types'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import {
  getEventAsync,
  putEventAsync,
  updateEventInstanceAsync
} from '@/features/Calendars/services'
import { fetchEvent } from '@/features/Events/EventDao'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { parseFetchedEvent } from '@/features/Events/transformers/parseFetchedEvent'
import { updateAttendeesAfterTimeChange } from '@/features/Events/updateEventHelpers/updateAttendeesAfterTimeChange'
import { handleUpdateRecurringSeries } from '@/features/Events/hooks/submitUpdateHelpers/updateActions'
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
import { getSeriesInstances } from '@/features/Events/hooks/submitUpdateHelpers/utils'

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
  ): { event: CalendarEvent; calendar: Calendar; calId: string } | null => {
    if (!eventApi || !eventApi.extendedProps) {
      return null
    }

    const calId = eventApi.extendedProps.calId as string
    const uid = eventApi.extendedProps.uid as string

    const calendar = calendars[calId]
    const event = calendar?.events[uid]

    if (!event || !calendar) return null

    return { event, calendar, calId }
  }

  const handleUpdateAllSeries = async ({
    event,
    calendar,
    calId,
    computedNewStart,
    computedNewEnd
  }: {
    event: CalendarEvent
    calendar: Calendar
    calId: string
    computedNewStart: Date
    computedNewEnd: Date
  }): Promise<void> => {
    const masterEventToFetch = {
      ...event,
      uid: event.uid.split('/')[0]
    }
    const response = await fetchEvent(masterEventToFetch)
    const master = parseFetchedEvent(masterEventToFetch, response, true)

    const masterTz = master.timezone || timezone
    const instanceDefaultStart = event.recurrenceId
      ? moment.tz(event.recurrenceId, master.timezone || masterTz)
      : moment.tz(event.start, master.timezone || masterTz)

    const seriesDeltaMs =
      moment(computedNewStart).valueOf() - instanceDefaultStart.valueOf()

    const masterStart = moment
      .tz(master.start, masterTz)
      .add(seriesDeltaMs, 'ms')
    const masterEnd = master.end
      ? moment.tz(master.end, masterTz).add(seriesDeltaMs, 'ms')
      : moment
          .tz(master.start, masterTz)
          .add(seriesDeltaMs, 'ms')
          .add(moment(computedNewEnd).diff(moment(computedNewStart)))

    const shiftedMasterEvent = {
      ...master,
      start: formatLocalDateTime(masterStart.toDate(), masterTz),
      end: formatLocalDateTime(masterEnd.toDate(), masterTz)
    }

    await handleUpdateRecurringSeries({
      dispatch,
      calId,
      newEvent: shiftedMasterEvent,
      targetCalendar: calendar,
      values: {
        ...DEFAULT_FORM_VALUES,
        start: masterStart.toISOString(),
        end: masterEnd.toISOString(),
        allday: master.allday ?? false,
        timezone: masterTz,
        repetition: master.repetition ?? DEFAULT_FORM_VALUES.repetition
      },
      tempContext: {},
      event: master,
      baseUID: master.uid,
      eventId: event.uid,
      getSeriesInstances: () => getSeriesInstances(calendar, master.uid),
      recurrenceId: event.recurrenceId
    })
  }

  const processTimeChange = async ({
    event,
    calendar,
    calId,
    computedNewStart,
    computedNewEnd
  }: {
    event: CalendarEvent
    calendar: Calendar
    calId: string
    computedNewStart: Date
    computedNewEnd: Date
  }): Promise<void> => {
    const isRecurring = event.uid.includes('/')

    const newEvent = updateAttendeesAfterTimeChange(
      {
        ...event,
        start: formatLocalDateTime(computedNewStart, event.timezone),
        end: formatLocalDateTime(computedNewEnd, event.timezone),
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
              await handleUpdateAllSeries({
                event,
                calendar,
                calId,
                computedNewStart,
                computedNewEnd
              })
            }
          }
      )
    } else {
      await dispatch(putEventAsync({ cal: calendar, newEvent }))
    }
  }

  const handleTimeChangeAction = async (
    eventApi: EventApi,
    getDeltas: () => { startDeltaMs: number; endDeltaMs: number }
  ): Promise<void> => {
    const data = getEventAndCalendar(eventApi)
    if (!data) return
    const { event, calendar, calId } = data

    const response = await fetchEvent(event)
    const fullEvent = parseFetchedEvent(event, response)
    const eventTz = fullEvent.timezone || timezone

    const { startDeltaMs, endDeltaMs } = getDeltas()
    const originalStart = moment.tz(event.start, eventTz)
    const computedNewStart = new Date(originalStart.valueOf() + startDeltaMs)
    const originalEnd = moment.tz(event.end ?? event.start, eventTz)
    const computedNewEnd = new Date(originalEnd.valueOf() + endDeltaMs)

    await processTimeChange({
      event: {
        ...event,
        timezone: eventTz
      },
      calendar,
      calId,
      computedNewStart,
      computedNewEnd
    })
  }

  const handleEventDrop = async (arg: EventDropArg): Promise<void> => {
    await handleTimeChangeAction(arg.event, () => {
      const delta = getDeltaInMilliseconds(arg.delta)
      return { startDeltaMs: delta, endDeltaMs: delta }
    })
  }

  const handleEventResize = async (arg: EventResizeDoneArg): Promise<void> => {
    await handleTimeChangeAction(arg.event, () => ({
      startDeltaMs: getDeltaInMilliseconds(arg.startDelta),
      endDeltaMs: getDeltaInMilliseconds(arg.endDelta)
    }))
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
