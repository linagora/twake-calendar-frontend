import { useState, useCallback, MutableRefObject } from 'react'
import { CalendarApi } from '@fullcalendar/core'

export const useSwipeAnimation = (
  calendarRef: MutableRefObject<CalendarApi | null>
): {
  offsetX: number
  isAnimating: boolean
  setOffsetX: (offset: number) => void
  finalizeSwipe: (targetOffset: number, deltaX: number) => void
  cancelSwipe: () => void
  setIsAnimating: (isAnimating: boolean) => void
} => {
  const [offsetX, setOffsetX] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const finalizeSwipe = useCallback(
    (targetOffset: number, deltaX: number) => {
      setIsAnimating(true)
      setOffsetX(targetOffset)

      setTimeout(() => {
        setIsAnimating(false)
        setOffsetX(-targetOffset)

        // Apply date change
        if (deltaX > 0) {
          calendarRef.current?.prev()
        } else {
          calendarRef.current?.next()
        }

        // Slide back to center (requesting animation state)
        requestAnimationFrame(() => {
          setIsAnimating(true)
          setOffsetX(0)
        })

        // Immediate reset to preserve "snappy" behavior as per latest user tweak
        setIsAnimating(false)
      }, 100)
    },
    [calendarRef]
  )

  const cancelSwipe = useCallback(() => {
    setIsAnimating(true)
    setOffsetX(0)
    setTimeout(() => {
      setIsAnimating(false)
    }, 150)
  }, [])

  return {
    offsetX,
    isAnimating,
    setOffsetX,
    setIsAnimating,
    finalizeSwipe,
    cancelSwipe
  }
}
