import { AppDispatch } from '@common/app/store'
import { DEFAULT_FORM_VALUES } from '@common/components/Event/EventFormFields.types'
import { formatLocalDateTime } from '@common/components/Event/utils/dateTimeFormatters'
import {
  getEvent,
  putEvent,
  updateEventInstance
} from '@common/features/Calendars/CalendarSlice'
import { fetchEvent } from '@common/features/Events/EventDao'
import { handleUpdateRecurringSeries } from '@common/features/Events/hooks/submitUpdateHelpers/updateActions'
import { getSeriesInstances } from '@common/features/Events/hooks/submitUpdateHelpers/utils'
import { parseFetchedEvent } from '@common/features/Events/transformers'
import { updateAttendeesAfterTimeChange } from '@common/features/Events/updateEventHelpers/updateAttendeesAfterTimeChange'
import {
  userAttendee,
  UserAttendeeOptions
} from '@common/features/User/models/attendee'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { getDeltaInMilliseconds } from '@common/utils/dateUtils'
import {
  CalendarApi,
  DateSelectArg,
  EventApi,
  EventClickArg,
  EventDropArg
} from '@fullcalendar/core'
import { EventResizeDoneArg } from '@fullcalendar/interaction'
import { User } from '@sentry/react'
import moment from 'moment'
import type { BookingLink } from '@common/features/booking/types/BookingTypes'

export interface EventHandlersProps {
  setSelectedRange: (range: DateSelectArg | null) => void
  setAnchorEl: (el: HTMLElement | null) => void
  calendarRef: React.RefObject<CalendarApi | null>
  dispatch: AppDispatch
  setOpenEventDisplay: (open: boolean) => void
  openEventDisplay: boolean
  setEventDisplayedId: (id: string) => void
  eventDisplayedId: string
  setEventDisplayedCalId: (id: string) => void
  eventDisplayedCalId: string
  setEventDisplayedTemp: (temp: boolean) => void
  calendars: Record<string, Calendar>
  setSelectedEvent: (event: CalendarEvent) => void
  setAfterChoiceFunc: (
    func: ((type: 'solo' | 'all' | undefined) => void) | undefined
  ) => void
  setOpenEditModePopup: (open: string | null) => void // Wait, in Calendar.tsx line 364, it's string | null
  tempUsers: User[]
  setTempEvent: (event: CalendarEvent) => void
  timezone: string
  onEditBookingLink?: (link: BookingLink) => void
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
    timezone,
    onEditBookingLink
  } = props

  const handleDateSelect = (selectInfo: DateSelectArg | null): void => {
    setSelectedRange(selectInfo)
    if (tempUsers) {
      setTempEvent(buildInitialTempEvent(selectInfo, timezone, tempUsers))
    }
    const targetEl =
      (selectInfo?.jsEvent?.target as HTMLElement) || document.body
    setAnchorEl(targetEl)
  }

  const handleClosePopover = (): void => {
    calendarRef.current?.unselect()
    setAnchorEl(null)
    setSelectedRange(null)
  }

  const handleCloseEventDisplay = (): void => {
    setOpenEventDisplay(false)
    setAnchorEl(null)
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

  const getEventClickTarget = (
    jsEvent?: EventClickArg['jsEvent'],
    fallbackEl?: HTMLElement
  ): HTMLElement => {
    const target = jsEvent?.target as HTMLElement | undefined
    const currentTarget = jsEvent?.currentTarget as HTMLElement | undefined

    return (
      (target?.closest(
        '.fc-event, .fc-daygrid-event, .fc-timegrid-event'
      ) as HTMLElement) ||
      currentTarget ||
      fallbackEl ||
      target ||
      document.body
    )
  }

  /**
   * The grid is filled by an expanded REPORT, which returns occurrences without
   * the RRULE of their master: a recurring instance therefore reaches the store
   * with no repetition, and that gap justifies fetching the whole event again.
   */
  const lacksSeriesRepetition = (event: CalendarEvent): boolean =>
    event.uid.includes('/') && event.repetition === undefined

  /**
   * That same REPORT normalises every time to UTC, and states the zone the event
   * was written in aside, as a VTIMEZONE. Should it not state it at all, reading
   * the event back is the only way to reopen it in the zone it was created with,
   * rather than in the one of the browser.
   */
  const lacksOriginalTimezone = (event: CalendarEvent): boolean =>
    !event.timezone

  const needsFullRead = (event: CalendarEvent): boolean =>
    lacksSeriesRepetition(event) || lacksOriginalTimezone(event)

  const dispatchGetEventIfPresent = (
    dispatch: AppDispatch,
    calendars: Record<string, Calendar>,
    calId?: string,
    uid?: string
  ): void => {
    if (!calId || !uid) return
    const event = calendars[calId]?.events?.[uid]
    if (event && needsFullRead(event)) {
      void dispatch(getEvent(event))
    }
  }

  const handleEventClick = (info: EventClickArg): void => {
    info.jsEvent.preventDefault()

    const bookingLink = info.event.extendedProps.bookingLink as
      | BookingLink
      | undefined
    if (
      info.event.extendedProps.isBookingLink &&
      bookingLink &&
      onEditBookingLink
    ) {
      onEditBookingLink(bookingLink)
      return
    }

    setAnchorEl(getEventClickTarget(info.jsEvent, info.el))

    if (info.event.url) {
      openEventViaUrl(info.event.url)
      return
    }

    const calId = info.event.extendedProps.calId as string
    const uid = info.event.extendedProps.uid as string

    setOpenEventDisplay(true)
    dispatchGetEventIfPresent(dispatch, calendars, calId, uid)

    setEventDisplayedId(uid)
    setEventDisplayedCalId(calId)
    setEventDisplayedTemp(info.event._def.extendedProps.temp as boolean)
  }

  const handleEventAllow = (): boolean => {
    return true
  }

  const mapTempUserToAttendee = (user: User): userAttendee => {
    const attendeeOption: UserAttendeeOptions = {
      cal_address: user.email,
      cn: user.displayName as string,
      rsvp: 'TRUE'
    }

    if (user.objectType === 'resource') {
      attendeeOption.cutype = 'RESOURCE'
    }
    return new userAttendee(attendeeOption)
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

    const shiftedMasterEvent = updateAttendeesAfterTimeChange(
      {
        ...master,
        start: formatLocalDateTime(masterStart.toDate(), masterTz),
        end: formatLocalDateTime(masterEnd.toDate(), masterTz)
      },
      true
    )

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
                updateEventInstance({ cal: calendar, event: newEvent })
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
      await dispatch(putEvent({ cal: calendar, newEvent }))
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
