import { DateSelectArg } from '@fullcalendar/core'
import { endOfDay } from 'date-fns'
import { RefObject, useEffect } from 'react'

const MOVE_THRESHOLD = 10
const TAP_DURATION = 200

function isTapGesture(dx: number, dy: number, duration: number): boolean {
  return dx < MOVE_THRESHOLD && dy < MOVE_THRESHOLD && duration < TAP_DURATION
}

function getTimeAtPoint(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y)
  return (
    (el as HTMLElement)?.closest('[data-time]')?.getAttribute('data-time') ??
    null
  )
}

function getDateAtPoint(x: number): string | null {
  const col = Array.from(document.querySelectorAll('[data-date]')).find(el => {
    const rect = el.getBoundingClientRect()
    return x >= rect.left && x <= rect.right
  })
  return col?.getAttribute('data-date') ?? null
}

function buildSelectArg(date: string, time: string): DateSelectArg {
  const start = new Date(`${date}T${time}`)
  const end = new Date(start.getTime() + 30 * 60 * 1000)
  return { start, end, allDay: false } as DateSelectArg
}

function isAllDayTap(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y)
  if (
    el?.closest(
      '.fc-event, .fc-daygrid-more-link, a, button, [role="button"], [data-navlink]'
    )
  ) {
    return null
  }
  const dayCell = el?.closest('.fc-daygrid-body td.fc-daygrid-day[data-date]')
  return dayCell?.getAttribute('data-date') ?? null
}

export function useTouchListener(
  handleDateSelect: (selectInfo: DateSelectArg | null) => void,
  isTouch: boolean,
  wrapperRef: RefObject<HTMLDivElement>
): void {
  useEffect(() => {
    const el = wrapperRef.current
    if (!el || !isTouch) return

    let startX = 0,
      startY = 0,
      startTime = 0

    const onTouchStart = (e: TouchEvent): void => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      startTime = Date.now()
    }

    const onTouchEnd = (e: TouchEvent): void => {
      const touch = e.changedTouches[0]
      const dx = Math.abs(touch.clientX - startX)
      const dy = Math.abs(touch.clientY - startY)

      if (!isTapGesture(dx, dy, Date.now() - startTime)) return

      const time = getTimeAtPoint(touch.clientX, touch.clientY)
      const date = getDateAtPoint(touch.clientX)

      if (time && date) {
        handleDateSelect(buildSelectArg(date, time))
        return
      }

      const allDayDate = isAllDayTap(touch.clientX, touch.clientY)
      if (allDayDate) {
        const startOfDay = new Date(`${allDayDate}T00:00:00`)
        const endDate = endOfDay(new Date(allDayDate))
        handleDateSelect({
          start: startOfDay,
          end: endDate,
          allDay: true
        } as DateSelectArg)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return (): void => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [handleDateSelect, isTouch, wrapperRef])
}
