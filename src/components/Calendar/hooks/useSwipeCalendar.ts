import {
  useRef,
  useState,
  useCallback,
  MutableRefObject,
  RefObject
} from 'react'
import { CalendarApi } from '@fullcalendar/core'
import { useSwipeAnimation } from './useSwipeAnimation'

interface UseSwipeCalendarProps {
  calendarRef: MutableRefObject<CalendarApi | null>
  containerRef: RefObject<HTMLElement>
  isMobile: boolean
}

interface SwipeCalendarReturn {
  offsetX: number
  isAnimating: boolean
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
}

const isHorizontalSwipe = (deltaX: number, deltaY: number): boolean => {
  return Math.abs(deltaX) > Math.abs(deltaY) || Math.abs(deltaX) > 10
}

const getTargetOffset = (
  deltaX: number,
  containerWidth: number,
  threshold: number
): number | null => {
  if (Math.abs(deltaX) <= threshold) return null
  return deltaX > 0 ? containerWidth : -containerWidth
}

const preventSwipping = (): void => {}

export const useSwipeCalendar = ({
  calendarRef,
  containerRef,
  isMobile
}: UseSwipeCalendarProps): SwipeCalendarReturn => {
  const { offsetX, isAnimating, setOffsetX, finalizeSwipe, cancelSwipe } =
    useSwipeAnimation(calendarRef)
  const [containerWidth, setContainerWidth] = useState(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (containerRef.current)
        setContainerWidth(containerRef.current.getBoundingClientRect().width)
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      }
    },
    [containerRef]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return
      const dx = e.touches[0].clientX - touchStartRef.current.x
      const dy = e.touches[0].clientY - touchStartRef.current.y
      if (isHorizontalSwipe(dx, dy)) setOffsetX(dx)
    },
    [setOffsetX]
  )

  const onTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !calendarRef.current) return setOffsetX(0)
    const target = getTargetOffset(
      offsetX,
      containerWidth,
      containerWidth * 0.1
    )
    if (target !== null) finalizeSwipe(target, offsetX)
    else cancelSwipe()
    touchStartRef.current = null
  }, [
    calendarRef,
    offsetX,
    containerWidth,
    finalizeSwipe,
    cancelSwipe,
    setOffsetX
  ])

  if (!isMobile) {
    return {
      offsetX: 0,
      isAnimating: false,
      onTouchStart: preventSwipping,
      onTouchMove: preventSwipping,
      onTouchEnd: preventSwipping
    }
  }

  return { offsetX, isAnimating, onTouchStart, onTouchMove, onTouchEnd }
}
