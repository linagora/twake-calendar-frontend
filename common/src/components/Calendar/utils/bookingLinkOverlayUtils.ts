import moment from 'moment-timezone'
import type { CalendarApi } from '@fullcalendar/core'
import {
  AvailabilityRule,
  BookingLink,
  DayOfWeek
} from '@common/features/booking/types/BookingTypes'
import { computeStartOfTheWeek } from '@common/utils/dateUtils'

export const DAY_TO_INDEX: Record<DayOfWeek, number> = {
  MON: 0,
  TUE: 1,
  WED: 2,
  THU: 3,
  FRI: 4,
  SAT: 5,
  SUN: 6
}

export const DEFAULT_SLOT_DURATION_MINUTES = 30
export const DEFAULT_STRIP_WIDTH_PX = 16
export const STRIP_OFFSET_PX = 4
export const MIN_STRIP_DURATION_MINUTES = 15
export const CONTAINER_FIND_DELAY_MS = 150
export const TIME_FORMAT_REGEX = /^\d{2}:\d{2}:\d{2}$/

export interface StripPosition {
  top: number
  height: number
  left: number
  width: number
  color: string
  linkId: string
  ruleId: string
  linkName?: string
  durationMinutes: number
  active?: boolean
}

export interface TimeSlotMetrics {
  slotDurationMinutes: number
  slotHeightPixels: number
  pixelsPerMinute: number
}

export interface ColumnPosition {
  left: number
  width: number
}

export interface StripTimeInfo {
  startMinutes: number
  durationMinutes: number
}

export function getSlotDurationMinutes(
  calendarApi: CalendarApi | null
): number {
  if (!calendarApi) return DEFAULT_SLOT_DURATION_MINUTES
  const view = calendarApi.view as unknown as {
    options?: {
      slotDuration?: { milliseconds?: number; hours?: number; minutes?: number }
    }
  }
  const d = view.options?.slotDuration
  if (!d) return DEFAULT_SLOT_DURATION_MINUTES
  if (d.milliseconds !== undefined) return Math.round(d.milliseconds / 60000)
  return (d.hours ?? 0) * 60 + (d.minutes ?? 0)
}

export function getSlotHeightPixels(container: HTMLElement): number {
  const slotEl = container.querySelector('.fc-timegrid-slot')
  return slotEl?.getBoundingClientRect().height ?? 0
}

export function calculateTimeSlotMetrics(
  calendarApi: CalendarApi | null,
  container: HTMLElement
): TimeSlotMetrics | null {
  const slotDurationMinutes = getSlotDurationMinutes(calendarApi)
  const slotHeightPixels = getSlotHeightPixels(container)

  if (slotHeightPixels === 0) return null

  return {
    slotDurationMinutes,
    slotHeightPixels,
    pixelsPerMinute: slotHeightPixels / slotDurationMinutes
  }
}

export function getTimeSlotOffset(
  container: HTMLElement,
  time: string
): number | null {
  const slotEl = container.querySelector<HTMLElement>(
    `.fc-timegrid-slot[data-time="${time}"]`
  )
  return slotEl?.offsetTop ?? null
}

export function getDayColumnPosition(
  container: HTMLElement,
  dateString: string
): ColumnPosition | null {
  const dayEl = container.querySelector<HTMLElement>(
    `.fc-timegrid-col[data-date="${dateString}"]`
  )
  if (!dayEl) return null

  const containerRect = container.getBoundingClientRect()
  const dayRect = dayEl.getBoundingClientRect()

  return {
    left: dayRect.left - containerRect.left,
    width: dayRect.width
  }
}

export function findFirstTimeSlot(container: HTMLElement): {
  element: HTMLElement
  time: string
} | null {
  const firstSlot = container.querySelector<HTMLElement>(
    '.fc-timegrid-slot[data-time]'
  )
  if (!firstSlot) return null

  const time = firstSlot.getAttribute('data-time')
  if (!time || !TIME_FORMAT_REGEX.test(time)) return null

  return { element: firstSlot, time }
}

export function getStripTimes(
  rule: AvailabilityRule & { dayOfWeek: string; timeZone?: string },
  dayIndex: number,
  startOfWeek: Date,
  calendarTimezone: string
): StripTimeInfo | null {
  const ruleTimezone = rule.timeZone || calendarTimezone

  // Build the day date in the rule's timezone
  const weekStartInRuleTz = moment.tz(startOfWeek, ruleTimezone).startOf('day')
  const ruleDayInRuleTz = weekStartInRuleTz.clone().add(dayIndex, 'days')

  const startInRuleTz = ruleDayInRuleTz
    .clone()
    .startOf('day')
    .add(moment.duration(rule.start))
  const endInRuleTz = ruleDayInRuleTz
    .clone()
    .startOf('day')
    .add(moment.duration(rule.end))

  // Convert to calendar timezone
  const startInCalTz = startInRuleTz.clone().tz(calendarTimezone)
  const endInCalTz = endInRuleTz.clone().tz(calendarTimezone)

  const startMinutes = startInCalTz.hours() * 60 + startInCalTz.minutes()
  const durationMinutes = endInCalTz.diff(startInCalTz, 'minutes')

  return { startMinutes, durationMinutes }
}

export function calculateTopOffset(
  container: HTMLElement,
  startMinutes: number,
  slotDurationMinutes: number,
  pixelsPerMinute: number
): number {
  const slotStartMinutes =
    Math.floor(startMinutes / slotDurationMinutes) * slotDurationMinutes
  const startH = Math.floor(slotStartMinutes / 60)
  const startM = slotStartMinutes % 60
  const slotTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`

  const slotTop = getTimeSlotOffset(container, slotTime)

  if (slotTop !== null) {
    return slotTop + (startMinutes - slotStartMinutes) * pixelsPerMinute
  }

  // Fallback: calculate from first visible slot
  const firstSlot = findFirstTimeSlot(container)
  if (firstSlot) {
    const { hours: fh, minutes: fm } = parseTimeString(firstSlot.time)
    return (
      firstSlot.element.offsetTop +
      (startMinutes - (fh * 60 + fm)) * pixelsPerMinute
    )
  }

  // Ultimate fallback
  return startMinutes * pixelsPerMinute
}

interface StripRenderContext {
  container: HTMLElement
  calendarTimezone: string
  startOfWeek: Date
  metrics: TimeSlotMetrics
}

export function createStripPosition(
  link: BookingLink,
  rule: AvailabilityRule & { dayOfWeek: string },
  ruleIndex: number,
  ctx: StripRenderContext
): StripPosition | null {
  const dayIndex = DAY_TO_INDEX[rule.dayOfWeek as keyof typeof DAY_TO_INDEX]
  const dateString = moment
    .tz(ctx.startOfWeek, ctx.calendarTimezone)
    .startOf('day')
    .add(dayIndex, 'days')
    .format('YYYY-MM-DD')

  const columnPos = getDayColumnPosition(ctx.container, dateString)
  if (!columnPos) return null

  const timeInfo = getStripTimes(
    rule,
    dayIndex,
    ctx.startOfWeek,
    ctx.calendarTimezone
  )

  if (!timeInfo) return null

  const { startMinutes, durationMinutes } = timeInfo

  const top = calculateTopOffset(
    ctx.container,
    startMinutes,
    ctx.metrics.slotDurationMinutes,
    ctx.metrics.pixelsPerMinute
  )

  return {
    top,
    height: durationMinutes * ctx.metrics.pixelsPerMinute,
    left: columnPos.left + STRIP_OFFSET_PX,
    width: DEFAULT_STRIP_WIDTH_PX,
    color: link.color || '#1976d2',
    linkId: link.publicId,
    ruleId: `${link.publicId}-${rule.dayOfWeek}-${ruleIndex}`,
    linkName: link.name,
    durationMinutes: Math.max(
      Math.round(durationMinutes),
      MIN_STRIP_DURATION_MINUTES
    ),
    active: link.active
  }
}

export function computeStripPositions(
  bookingLinks: BookingLink[],
  calendarApi: CalendarApi | null,
  container: HTMLElement,
  calendarTimezone: string
): StripPosition[] {
  if (!calendarApi) return []

  const metrics = calculateTimeSlotMetrics(calendarApi, container)
  if (!metrics) return []

  const ctx: StripRenderContext = {
    container,
    calendarTimezone,
    startOfWeek: computeStartOfTheWeek(calendarApi.view.currentStart),
    metrics
  }

  return bookingLinks.flatMap(link =>
    (link.availabilityRules ?? []).flatMap((rule, ruleIndex) => {
      if (rule.type !== 'weekly') return []
      const strip = createStripPosition(link, rule, ruleIndex, ctx)
      return strip ? [strip] : []
    })
  )
}
