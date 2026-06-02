import { AppDispatch } from '@/app/store'
import { Calendar, DelegationAccess } from '@/features/Calendars/CalendarTypes'
import { getCalendarDetailAsync } from '@/features/Calendars/services'
import { AclEntry } from '@/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { formatDateToYYYYMMDDTHHMMSS } from '@/utils/dateUtils'
import { extractEventBaseUuid } from '@/utils/extractEventBaseUuid'
import { getEffectiveEmail } from '@/utils/getEffectiveEmail'
import { isEventOrganiser } from '@/utils/isEventOrganiser'
import { convertEventDateTimeToISO } from '@/utils/timezone'
import { EventApi, EventInput, SlotLabelContentArg } from '@fullcalendar/core'
import moment from 'moment-timezone'

export const updateSlotLabelVisibility = (
  currentTime: Date,
  slotLabel: SlotLabelContentArg,
  timezone: string
): 'fc-timegrid-slot-label' | 'timegrid-slot-label-hidden' => {
  const isCurrentWeekOrDay = checkIfCurrentWeekOrDay()

  if (!isCurrentWeekOrDay) {
    return 'fc-timegrid-slot-label'
  }

  const current = moment.tz(currentTime, timezone)
  const currentMinutes = current.hours() * 60 + current.minutes()
  const timeText = slotLabel?.text?.trim()

  if (timeText && timeText.match(/^\d{1,2}:\d{2}$/)) {
    const [hours, minutes] = timeText.split(':').map(Number)
    const labelMinutes = hours * 60 + minutes

    let timeDiff = Math.abs(currentMinutes - labelMinutes)

    if (timeDiff > 12 * 60) {
      timeDiff = 24 * 60 - timeDiff
    }

    if (timeDiff <= 15) {
      return 'timegrid-slot-label-hidden'
    }
  }

  return 'fc-timegrid-slot-label'
}

export const checkIfCurrentWeekOrDay = (): boolean => {
  const todayColumn = document.querySelector('.fc-day-today')

  if (!todayColumn) {
    return false
  }

  const nowIndicator = document.querySelector(
    '.fc-timegrid-now-indicator-arrow'
  )
  return !!nowIndicator
}

export function formatEventChipTitle(
  e: CalendarEvent,
  t: (key: string) => string
): string {
  if (!e.title) {
    return t('event.untitled')
  }
  return e.title === 'Busy' && e.class === 'PRIVATE'
    ? t('event.form.busy')
    : e.title
}

type ConvertedEvent = CalendarEvent & {
  id: string
  colors: Record<string, string> | undefined
  editable: boolean
  priority: number
}

function applyAllDayTimezone(
  event: CalendarEvent,
  convertedEvent: ConvertedEvent
): void {
  if (event.start) {
    convertedEvent.start = event.start.split('T')[0]
  }
  if (event.end) {
    convertedEvent.end = event.end.split('T')[0]
  }
}

function applyTimedTimezone(
  event: CalendarEvent,
  convertedEvent: ConvertedEvent,
  tz: string
): void {
  if (event.start) {
    const startISO = convertEventDateTimeToISO(event.start, tz, {
      isAllDay: false
    })
    if (startISO) convertedEvent.start = startISO
  }

  if (event.end) {
    const endISO = convertEventDateTimeToISO(event.end, tz, {
      isAllDay: false
    })
    if (endISO) convertedEvent.end = endISO
  }
}

function applyTimezoneToEvent(
  event: CalendarEvent,
  convertedEvent: ConvertedEvent
): void {
  const eventTimezone = event.timezone || 'Etc/UTC'
  const isAllDay = event.allday ?? false

  if (isAllDay) {
    applyAllDayTimezone(event, convertedEvent)
    return
  }

  applyTimedTimezone(event, convertedEvent, eventTimezone)
}

function resolveWriteDelegation(
  calendar: Calendar | undefined,
  event: CalendarEvent
): boolean {
  if (!calendar?.delegated || !calendar.access?.write) return false
  return !event.class || event.class === 'PUBLIC'
}

function isEventEditable(
  isPersonal: boolean,
  isDelegated: boolean,
  isOrganiser: boolean,
  pending: boolean
): boolean {
  if (pending || !isOrganiser) return false
  return isPersonal || isDelegated
}

function buildConvertedEvent({
  event,
  calendar,
  userId,
  userAddress,
  pending,
  t
}: {
  event: CalendarEvent
  calendar: Calendar | undefined
  userId: string | undefined
  userAddress: string | undefined
  pending: boolean
  t: (key: string) => string
}): ConvertedEvent {
  const isWriteDelegated = resolveWriteDelegation(calendar, event)
  const effectiveEmail = getEffectiveEmail(
    calendar,
    isWriteDelegated,
    userAddress
  )

  const isOrganiser = isEventOrganiser(event, effectiveEmail)
  const isPersonalEvent = extractEventBaseUuid(event.calId) === userId

  const convertedEvent: ConvertedEvent = {
    ...event,
    // FullCalendar reconciles events by `id`, not by our `uid`. Without a
    // stable, grid-unique id it can't reliably drop chips when the event set
    // shrinks (e.g. deselecting a shared calendar) — most visibly for a
    // recurring series, whose occurrences are many sibling chips removed at
    // once. The uid already embeds the recurrenceId for occurrences (see
    // processEventUid), so it is unique within a calendar; the calId prefix
    // keeps it unique when the same uid is shared across displayed calendars.
    id: `${event.calId}/${event.uid}`,
    title: formatEventChipTitle(event, t),
    colors: event.color,
    editable: isEventEditable(
      isPersonalEvent,
      isWriteDelegated,
      isOrganiser,
      pending
    ),
    priority: isPersonalEvent ? 1 : 0
  }

  applyTimezoneToEvent(event, convertedEvent)

  return convertedEvent
}

export interface EventToFullCalendarFormatProps {
  filteredEvents: CalendarEvent[]
  filteredTempEvents: CalendarEvent[]
  userId: string | undefined
  userAddress: string | undefined
  pending: boolean
  calendars: Record<string, Calendar>
  t: (key: string, options?: Record<string, unknown>) => string
}

export const eventToFullCalendarFormat = ({
  filteredEvents,
  filteredTempEvents,
  userId,
  userAddress,
  pending,
  calendars,
  t
}: EventToFullCalendarFormatProps): EventInput[] => {
  return filteredEvents
    .concat(filteredTempEvents.map(event => ({ ...event, temp: true })))
    .map(event =>
      buildConvertedEvent({
        event,
        calendar: calendars[event.calId],
        userId,
        userAddress,
        pending,
        t
      })
    ) as EventInput[]
}

export const extractEvents = (
  selectedCalendars: string[],
  calendars: Record<string, Calendar>,
  userAddress?: string,
  hideDeclinedEvents?: boolean | null
): CalendarEvent[] => {
  const allEvents: CalendarEvent[] = []

  selectedCalendars.forEach(id => {
    const calendar = calendars[id]
    if (calendar?.events) {
      allEvents.push(...Object.values(calendar.events))
    }
  })

  return allEvents
    .filter(event => event.status !== 'CANCELLED')
    .filter(
      event =>
        !(
          hideDeclinedEvents &&
          event.attendee?.some(
            a =>
              calendars[event.calId].owner.emails.includes(a.cal_address) &&
              a.partstat === 'DECLINED'
          )
        )
    )
}

export const updateCalsDetails = (
  selectedCalendars: string[],
  previousSelectedCalendars: string[],
  pending: boolean,
  rangeKey: string,
  previousRangeKey: string,
  dispatch: AppDispatch,
  calendarRange: { start: Date; end: Date },
  calType?: 'temp',
  controllers?: Map<string, AbortController>
): void => {
  if (pending || !rangeKey) return

  const newCalendars = selectedCalendars.filter(
    id => !previousSelectedCalendars.includes(id)
  )

  newCalendars.forEach(id => {
    if (controllers) {
      const controller = new AbortController()
      controllers.set(id, controller)

      void dispatch(
        getCalendarDetailAsync({
          calId: id,
          match: {
            start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
            end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end)
          },
          calType,
          signal: controller.signal
        })
      )
    } else {
      void dispatch(
        getCalendarDetailAsync({
          calId: id,
          match: {
            start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
            end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end)
          },
          calType
        })
      )
    }
  })

  if (rangeKey !== previousRangeKey) {
    selectedCalendars?.forEach(id => {
      if (id) {
        if (controllers) {
          const controller = new AbortController()
          controllers.set(id, controller)

          void dispatch(
            getCalendarDetailAsync({
              calId: id,
              match: {
                start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
                end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end)
              },
              calType,
              signal: controller.signal
            })
          )
        } else {
          void dispatch(
            getCalendarDetailAsync({
              calId: id,
              match: {
                start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
                end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end)
              },
              calType
            })
          )
        }
      }
    })
  }
}

export function getCalendarVisibility(acl: AclEntry[]): 'private' | 'public' {
  let hasRead = false
  if (acl) {
    for (const entry of acl) {
      if (entry.principal !== '{DAV:}authenticated') continue

      if (entry.privilege === '{DAV:}read') {
        hasRead = true
        break // highest visibility, can stop
      }
    }
  }
  if (hasRead) return 'public'
  return 'private'
}

export function getCalendarDelegationAccess(
  acl: AclEntry[],
  userId: string
): DelegationAccess {
  const userPrincipal = `principals/users/${userId}`
  const access: DelegationAccess = {
    freebusy: false,
    read: false,
    write: false,
    'write-properties': false,
    all: false
  }

  for (const entry of acl ?? []) {
    if (entry.principal !== userPrincipal) continue
    privilegeToAccess(entry.privilege, access)
  }

  return access
}

function privilegeToAccess(
  privilege: string,
  currentAccess: DelegationAccess
): void {
  switch (privilege) {
    case '{urn:ietf:params:xml:ns:caldav}read-free-busy':
      currentAccess['freebusy'] = true
      break
    case '{DAV:}read':
      currentAccess['read'] = true
      currentAccess['freebusy'] = true // read implies read-free-busy
      break
    case '{DAV:}write-properties':
      currentAccess['write-properties'] = true
      break
    case '{DAV:}write':
      currentAccess['write-properties'] = true // write implies write-properties
      currentAccess['write'] = true
      break
    case '{DAV:}all':
      currentAccess['freebusy'] = true
      currentAccess['read'] = true
      currentAccess['write-properties'] = true
      currentAccess['write'] = true
      currentAccess['all'] = true
      break
    default:
      break
  }
}

const getTime = (date: Date | null): number => {
  return date ? new Date(date).getTime() : 0
}

export const sortEventsByDateTime = (
  curEvent: EventApi,
  nextEvent: EventApi
): number => {
  const aStart = getTime(curEvent.start)
  const bStart = getTime(nextEvent.start)
  if (aStart !== bStart) return aStart - bStart

  // Tiebreak by end time so longer events sort later
  const aEnd = getTime(curEvent.end)
  const bEnd = getTime(nextEvent.end)
  if (aEnd !== bEnd) return aEnd - bEnd

  // Final tiebreak by priority (personal events first)
  const aPriority =
    (curEvent.extendedProps as { priority?: number })?.priority ?? 0
  const bPriority =
    (nextEvent.extendedProps as { priority?: number })?.priority ?? 0
  return aPriority - bPriority
}
