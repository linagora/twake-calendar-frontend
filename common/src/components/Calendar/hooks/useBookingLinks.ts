import { useMemo } from 'react'
import { useAppSelector } from '@common/app/hooks'
import type { RootState } from '@common/app/store'
import type { EventInput } from '@fullcalendar/core'
import type {
  BookingLink,
  AvailabilityRule
} from '@common/features/booking/types/BookingTypes'
import moment from 'moment-timezone'

export function useFilteredBookingLinks(
  visibleBookingLinks: string[] | undefined
): BookingLink[] {
  const allBookingLinks = useAppSelector(
    (state: RootState) => state.bookingLinks.list
  )

  return useMemo(() => {
    if (!visibleBookingLinks?.length) return []
    return allBookingLinks.filter((link: BookingLink) =>
      visibleBookingLinks.includes(link.publicId)
    )
  }, [allBookingLinks, visibleBookingLinks])
}

function buildEventsForRule(
  link: BookingLink,
  rule: AvailabilityRule & { dayOfWeek: string; timeZone?: string },
  totalWeeks: number,
  effectiveRangeStart: moment.Moment
): EventInput[] {
  const ruleTimeZone = rule.timeZone || 'UTC'
  return Array.from({ length: totalWeeks }, (_, weekOffset) => {
    const targetDate = effectiveRangeStart
      .clone()
      .add(weekOffset, 'weeks')
      .day(rule.dayOfWeek)
    const dateStr = targetDate.format('YYYY-MM-DD')
    const startMoment = moment.tz(`${dateStr}T${rule.start}:00`, ruleTimeZone)
    const endMoment = moment.tz(`${dateStr}T${rule.end}:00`, ruleTimeZone)
    return {
      id: `${link.publicId}-${rule.dayOfWeek}-w${weekOffset}`,
      title: link.name,
      start: startMoment.toISOString(),
      end: endMoment.toISOString(),
      backgroundColor: link.color,
      borderColor: link.color,
      extendedProps: {
        calId: link.publicId,
        colors: link.color
          ? { dark: link.color, light: link.color }
          : undefined,
        attendee: [],
        class: 'PUBLIC',
        isBookingLink: true,
        active: link.active,
        bookingLink: link
      },
      priority: 0
    }
  })
}

export function useBookingLinksEvents(
  visibleBookingLinks: string[] | undefined,
  rangeStart?: Date,
  rangeEnd?: Date
): EventInput[] {
  const allBookingLinks = useAppSelector(
    (state: RootState) => state.bookingLinks.list
  )

  // Use primitive values (timestamps) for stable dependencies
  const rangeStartTime = rangeStart?.getTime()
  const rangeEndTime = rangeEnd?.getTime()

  return useMemo(() => {
    const totalWeeks =
      rangeStartTime && rangeEndTime
        ? moment(rangeEndTime).diff(moment(rangeStartTime), 'weeks') + 1
        : 6
    const effectiveRangeStart = moment(rangeStartTime).startOf('week')

    const filteredLinks = allBookingLinks.filter(link =>
      visibleBookingLinks?.includes(link.publicId)
    )

    return filteredLinks.flatMap(link => {
      const weeklyRules = (link.availabilityRules ?? []).filter(
        rule => rule.type === 'weekly'
      )
      return weeklyRules.flatMap(rule =>
        buildEventsForRule(
          link,
          rule as AvailabilityRule & {
            dayOfWeek: string
            timeZone?: string
          },
          totalWeeks,
          effectiveRangeStart
        )
      )
    })
  }, [allBookingLinks, visibleBookingLinks, rangeStartTime, rangeEndTime])
}
