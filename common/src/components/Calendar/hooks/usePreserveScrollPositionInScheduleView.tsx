import { useEffect, useRef } from 'react'
import { isListView } from '@common/components/Calendar/utils/constants'

export const usePreserveScrollPositionInScheduleView = (
  openEventDisplay: boolean,
  currentView: string
): void => {
  const savedScrollTop = useRef<number>(0)
  const isTransitioning = useRef<boolean>(false)

  // 1. TRACKING
  useEffect(() => {
    if (!isListView(currentView)) {
      savedScrollTop.current = 0
      return
    }

    const handleScroll = (e: Event): void => {
      if (isTransitioning.current) return

      const target = e.target
      const isListView =
        target instanceof Element &&
        target.classList.contains('fc-scroller') &&
        target.closest('.fc-list')
      if (isListView) {
        savedScrollTop.current = target.scrollTop
      }
    }

    window.addEventListener('scroll', handleScroll, true)
    return (): void => window.removeEventListener('scroll', handleScroll, true)
  }, [currentView])

  // 2. RESTORING
  useEffect(() => {
    // Early exit: No need to lock or animate if scroll is 0
    if (!isListView(currentView) || savedScrollTop.current === 0) return

    isTransitioning.current = true
    let frameId: number

    // Helper to keep the DOM query DRY
    const getScrollers = (): NodeListOf<HTMLElement> =>
      document.querySelectorAll<HTMLElement>('.fc-list .fc-scroller')

    const lockScroll = (): void => {
      getScrollers().forEach(scroller => {
        scroller.style.overflowY = 'hidden'
        if (scroller.scrollTop !== savedScrollTop.current) {
          scroller.scrollTop = savedScrollTop.current
        }
      })
      frameId = requestAnimationFrame(lockScroll)
    }

    frameId = requestAnimationFrame(lockScroll)

    const timeoutId = setTimeout(() => {
      cancelAnimationFrame(frameId)
      isTransitioning.current = false

      getScrollers().forEach(scroller => {
        scroller.style.overflowY = ''
      })
    }, 400)

    return (): void => {
      cancelAnimationFrame(frameId)
      clearTimeout(timeoutId)
      isTransitioning.current = false
      getScrollers().forEach(scroller => {
        scroller.style.overflowY = ''
      })
    }
  }, [openEventDisplay, currentView])
}
