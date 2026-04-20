import { CalendarApi } from '@fullcalendar/core'
import {
  MutableRefObject,
  TouchEvent,
  useCallback,
  useEffect,
  useRef
} from 'react'

const nextFrame = (): Promise<void> =>
  new Promise(resolve =>
    requestAnimationFrame(resolve as unknown as FrameRequestCallback)
  )
const delay = (ms: number): Promise<void> =>
  new Promise((resolve: (value: void | PromiseLike<void>) => void) =>
    setTimeout(resolve, ms)
  )

function clearGestureTimer(state: GestureState): void {
  if (state.timer) clearTimeout(state.timer)
  state.timer = null
}

function resetGesture(state: GestureState, wrapper: HTMLDivElement): void {
  state.swiping = false
  state.decided = false
  state.offset = 0
  clearGestureTimer(state)
  wrapper.style.transition = 'transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)'
  wrapper.style.transform = 'translateX(0px)'
}

function applySwipeOffset(
  state: GestureState,
  wrapper: HTMLDivElement,
  dx: number
): void {
  state.offset = dx
  wrapper.style.transform = `translateX(${dx}px)`
  wrapper.style.transition = 'none'
}

function decideGesture(state: GestureState, dx: number, dy: number): boolean {
  if (state.decided) return state.swiping

  if (Math.abs(dx) <= 10) {
    if (Math.abs(dy) <= 10) return false
  }

  state.decided = true
  state.swiping = Math.abs(dx) > Math.abs(dy)
  clearGestureTimer(state)
  return state.swiping
}

async function animatePagination(
  dir: number,
  api: CalendarApi,
  wrapper: HTMLDivElement,
  isMounted: () => boolean
): Promise<void> {
  const isSafe = (): boolean => isMounted() && !!wrapper

  wrapper.style.transition = 'none'
  wrapper.style.transform = `translateX(${dir * window.innerWidth}px)`

  await nextFrame()
  if (!isSafe()) return
  api[dir === 1 ? 'next' : 'prev']()

  await nextFrame()
  if (!isSafe()) return
  wrapper.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)'
  wrapper.style.transform = 'translateX(0px)'

  await delay(250)
  if (isSafe()) wrapper.style.transition = 'none'
}

type GestureState = {
  startX: number
  startY: number
  offset: number
  decided: boolean
  swiping: boolean
  longPress: boolean
  timer: ReturnType<typeof setTimeout> | null
}

function handleTouchStart(
  e: TouchEvent<HTMLDivElement>,
  state: GestureState,
  wrapperRef: MutableRefObject<HTMLDivElement | null>
): void {
  if (e.touches.length !== 1) return

  state.startX = e.touches[0].clientX
  state.startY = e.touches[0].clientY
  state.offset = 0
  state.decided = false
  state.swiping = false
  state.longPress = false

  clearGestureTimer(state)
  state.timer = setTimeout(() => {
    state.longPress = true
  }, 300)

  if (wrapperRef.current) wrapperRef.current.style.transition = 'none'
}

function handleTouchMove(
  e: TouchEvent<HTMLDivElement>,
  state: GestureState,
  wrapperRef: MutableRefObject<HTMLDivElement | null>
): void {
  const wrapper = wrapperRef.current
  if (state.longPress) return
  if (!wrapper) return

  if (e.touches.length !== 1) {
    resetGesture(state, wrapper)
    return
  }

  const touch = e.touches[0]
  if (!touch) {
    resetGesture(state, wrapper)
    return
  }

  const dx = touch.clientX - state.startX
  const dy = touch.clientY - state.startY

  if (decideGesture(state, dx, dy)) {
    applySwipeOffset(state, wrapper, dx)
  }
}

function handleTouchEnd(
  state: GestureState,
  wrapperRef: MutableRefObject<HTMLDivElement | null>,
  paginate: (dir: number) => Promise<void>
): void {
  clearGestureTimer(state)

  const isSwiping = state.swiping
  const finalOffset = state.offset

  state.offset = 0
  state.decided = false
  state.swiping = false
  state.longPress = false

  if (!isSwiping) return

  if (finalOffset < -60) {
    void paginate(1)
    return
  }

  if (finalOffset > 60) {
    void paginate(-1)
    return
  }

  if (wrapperRef.current) {
    wrapperRef.current.style.transition =
      'transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)'
    wrapperRef.current.style.transform = 'translateX(0px)'
  }
}

function useSwipePagination(
  calendarRef: MutableRefObject<CalendarApi | null>,
  wrapperRef: MutableRefObject<HTMLDivElement | null>
): (dir: number) => Promise<void> {
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return (): void => {
      isMountedRef.current = false
    }
  }, [])

  return useCallback(
    async (dir: number): Promise<void> => {
      const api = calendarRef.current
      const wrapper = wrapperRef.current

      if (!api) return
      if (!wrapper) return
      if (!isMountedRef.current) return

      await animatePagination(dir, api, wrapper, () => isMountedRef.current)
    },
    [calendarRef, wrapperRef]
  )
}

function useGestureTracking(
  wrapperRef: MutableRefObject<HTMLDivElement | null>,
  paginate: (dir: number) => Promise<void>
): {
  onTouchStart: (e: TouchEvent<HTMLDivElement>) => void
  onTouchMove: (e: TouchEvent<HTMLDivElement>) => void
  onTouchEnd: () => void
} {
  const state = useRef<GestureState>({
    startX: 0,
    startY: 0,
    offset: 0,
    decided: false,
    swiping: false,
    longPress: false,
    timer: null
  }).current

  return {
    onTouchStart: useCallback(
      (e: TouchEvent<HTMLDivElement>) => handleTouchStart(e, state, wrapperRef),
      [state, wrapperRef]
    ),
    onTouchMove: useCallback(
      (e: TouchEvent<HTMLDivElement>) => handleTouchMove(e, state, wrapperRef),
      [state, wrapperRef]
    ),
    onTouchEnd: useCallback(
      () => handleTouchEnd(state, wrapperRef, paginate),
      [state, wrapperRef, paginate]
    )
  }
}

export const useSwipeNavigation = (
  calendarRef: MutableRefObject<CalendarApi | null>,
  wrapperRef: MutableRefObject<HTMLDivElement | null>
): {
  handlers: {
    onTouchStart: (e: TouchEvent<HTMLDivElement>) => void
    onTouchMove: (e: TouchEvent<HTMLDivElement>) => void
    onTouchEnd: () => void
  }
} => {
  const paginate = useSwipePagination(calendarRef, wrapperRef)
  const handlers = useGestureTracking(wrapperRef, paginate)

  return { handlers }
}
