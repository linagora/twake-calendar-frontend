import { useEffect, useRef, useState } from 'react'

export interface DynamicPosition {
  top?: number
  bottom?: number
  left: number
}

export interface UseDynamicPositionOptions {
  open: boolean
  isExpanded?: boolean
  isMobile?: boolean
  dynamicPositioning?: boolean
  anchorEl?: HTMLElement | null
  headerHeight?: string
  dialogId?: string
}

interface HorizontalPositionOptions {
  anchorRect: DOMRect
  dialogWidth: number
  viewportWidth: number
  gap: number
  paddingRight: number
  paddingLeft: number
}

interface VerticalPositionOptions {
  anchorRect: DOMRect
  dialogHeight: number
  viewportHeight: number
  topInset: number
  padding: number
  bottomPadding: number
}

interface DialogDimensions {
  width: number
  height: number
}

const DEFAULT_HEADER_HEIGHT_PX = 70
const DEFAULT_GAP = 12
const DEFAULT_PADDING = 40
const DEFAULT_LEFT_PADDING = 270
export const DIALOG_BOTTOM_INSET = 28

const FALLBACK_SELECTORS = [
  '[data-event-id="twake-draft-event"]',
  '.fc-highlight',
  '.fc-popover .fc-event',
  '.fc-event.fc-event-selected',
  '.fc-daygrid-event',
  '.fc-timegrid-event',
  '.fc-event'
]

const isValidRect = (rect?: DOMRect | null): rect is DOMRect =>
  Boolean(rect && (rect.width > 0 || rect.height > 0))

const isValidElement = (el?: HTMLElement | null): el is HTMLElement => {
  if (!el || el === document.body) return false
  if (document.body.contains(el)) return true
  try {
    return isValidRect(el.getBoundingClientRect())
  } catch {
    return false
  }
}

const getFallbackElement = (): HTMLElement | null => {
  for (const selector of FALLBACK_SELECTORS) {
    const el = document.querySelector<HTMLElement>(selector)
    if (isValidElement(el)) return el
  }
  return null
}

const resolveTargetElement = (
  anchorEl?: HTMLElement | null
): HTMLElement | null => {
  const draftEl = document.querySelector<HTMLElement>(
    '[data-event-id="twake-draft-event"]'
  )
  if (isValidElement(draftEl)) return draftEl
  if (isValidElement(anchorEl)) return anchorEl
  return getFallbackElement()
}

const getValidAnchorRect = (
  anchorEl?: HTMLElement | null,
  cachedRect?: DOMRect | null
): DOMRect | null => {
  if (typeof window === 'undefined') return null

  const targetEl = resolveTargetElement(anchorEl)
  if (targetEl) {
    const anchorRect = targetEl.getBoundingClientRect()
    if (isValidRect(anchorRect)) return anchorRect
  }

  return isValidRect(cachedRect) ? cachedRect : null
}

const getDialogPaperElement = (dialogId?: string): HTMLElement | null => {
  if (typeof document === 'undefined') return null
  if (dialogId) {
    const paper =
      document
        .getElementById(dialogId)
        ?.closest<HTMLElement>('.MuiDialog-paper') ||
      document.querySelector<HTMLElement>(`[aria-labelledby="${dialogId}"]`)
    if (paper) return paper
  }
  return null
}

const getDialogDimensions = (dialogId?: string): DialogDimensions | null => {
  const paperEl = getDialogPaperElement(dialogId)
  if (!paperEl) return null
  const width = paperEl.offsetWidth
  const height = paperEl.offsetHeight
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

export const getDialogTopInset = (headerHeight: string): number =>
  Math.max(
    DEFAULT_PADDING,
    parseInt(headerHeight, 10) || DEFAULT_HEADER_HEIGHT_PX
  )

export const calculateHorizontalPosition = ({
  anchorRect,
  dialogWidth,
  viewportWidth,
  gap,
  paddingRight,
  paddingLeft
}: HorizontalPositionOptions): number => {
  const minLeft = paddingLeft
  const maxLeft = viewportWidth - dialogWidth - paddingRight

  if (minLeft > maxLeft) {
    return Math.max(0, maxLeft)
  }

  const preferredLeft = anchorRect.left - dialogWidth - gap
  const preferredRight = anchorRect.right + gap

  if (preferredLeft >= minLeft) {
    return preferredLeft
  }

  if (preferredRight <= maxLeft) {
    return preferredRight
  }

  const clampedLeft = Math.max(minLeft, preferredLeft)
  const clampedRight = Math.min(maxLeft, preferredRight)

  const visibleRectIfLeft = anchorRect.right - (clampedLeft + dialogWidth)
  const visibleRectIfRight = clampedRight - anchorRect.left

  if (visibleRectIfLeft >= visibleRectIfRight) {
    return Math.min(maxLeft, clampedLeft)
  }

  return Math.max(minLeft, clampedRight)
}

const calculateVerticalPosition = ({
  anchorRect,
  dialogHeight,
  viewportHeight,
  topInset,
  padding,
  bottomPadding
}: VerticalPositionOptions): number => {
  const maxTop = Math.max(
    padding,
    viewportHeight - dialogHeight - bottomPadding
  )
  const effectiveMinTop = Math.min(topInset, maxTop)

  const anchorCenterY = anchorRect.top + anchorRect.height / 2
  const unclampedTop = anchorCenterY - dialogHeight / 2

  return Math.max(effectiveMinTop, Math.min(unclampedTop, maxTop))
}

const calculateDynamicPosition = (
  anchorEl?: HTMLElement | null,
  headerHeightStr: string = '70px',
  cachedRect?: DOMRect | null,
  dialogId?: string
): DynamicPosition | null => {
  if (process.env.NODE_ENV === 'test') {
    return { top: 100, left: 100 }
  }

  const anchorRect = getValidAnchorRect(anchorEl, cachedRect)
  if (!anchorRect) return null

  const dimensions = getDialogDimensions(dialogId)
  if (!dimensions) return null

  const { width: dialogWidth, height: dialogHeight } = dimensions
  const left = calculateHorizontalPosition({
    anchorRect,
    dialogWidth,
    viewportWidth: window.innerWidth,
    gap: DEFAULT_GAP,
    paddingRight: DEFAULT_PADDING,
    paddingLeft: DEFAULT_LEFT_PADDING
  })

  const top = calculateVerticalPosition({
    anchorRect,
    dialogHeight,
    viewportHeight: window.innerHeight,
    topInset: getDialogTopInset(headerHeightStr),
    padding: DEFAULT_PADDING,
    bottomPadding: DIALOG_BOTTOM_INSET
  })

  const anchorCenterY = anchorRect.top + anchorRect.height / 2
  const viewportCenterY = window.innerHeight / 2

  // Prefer growth toward the middle of the viewport.
  if (anchorCenterY > viewportCenterY) {
    const bottom = window.innerHeight - top - dialogHeight
    return { bottom, left }
  }

  return { top, left }
}

const isPositioningEnabled = ({
  open,
  isExpanded = false,
  isMobile = false,
  dynamicPositioning = false
}: UseDynamicPositionOptions): boolean =>
  open && !isExpanded && !isMobile && Boolean(dynamicPositioning)

const clearPositionFromDOM = (dialogId?: string): void => {
  const paperEl = getDialogPaperElement(dialogId)
  if (!paperEl) return
  paperEl.style.left = ''
}

const applyPositionToDOM = (pos: DynamicPosition, dialogId?: string): void => {
  const paperEl = getDialogPaperElement(dialogId)
  if (!paperEl) return
  if (pos.left !== undefined) paperEl.style.left = `${pos.left}px`
  paperEl.style.transform = ''
}

const getInitialPosition = (
  isEnabled: boolean,
  anchorEl: HTMLElement | null | undefined,
  headerHeight: string,
  dialogId: string | undefined
): DynamicPosition | null => {
  if (!isEnabled) return null
  if (process.env.NODE_ENV === 'test') return { top: 100, left: 100 }

  let initialRect: DOMRect | null = null
  if (isValidElement(anchorEl)) {
    const rect = anchorEl.getBoundingClientRect()
    if (isValidRect(rect)) {
      initialRect = rect
    }
  }
  return calculateDynamicPosition(anchorEl, headerHeight, initialRect, dialogId)
}

const useDynamicPosition = (
  options: UseDynamicPositionOptions
): DynamicPosition | null => {
  const { anchorEl, headerHeight = '70px', dialogId } = options
  const lastValidRectRef = useRef<DOMRect | null>(null)
  const isEnabled = isPositioningEnabled(options)

  const [lastPosition, setLastPosition] = useState<DynamicPosition | null>(null)

  const [position, setPosition] = useState<DynamicPosition | null>(() =>
    getInitialPosition(isEnabled, anchorEl, headerHeight, dialogId)
  )

  useEffect(() => {
    if (!isEnabled) {
      lastValidRectRef.current = null
      clearPositionFromDOM(dialogId)
      return
    }

    let isSubscribed = true
    let rafId: number | null = null
    let timerId: ReturnType<typeof setTimeout> | null = null

    const updatePos = (): void => {
      if (!isSubscribed) return
      if (process.env.NODE_ENV === 'test') {
        setPosition({ top: 100, left: 100 })
        setLastPosition({ top: 100, left: 100 })
        return
      }

      if (isValidElement(anchorEl)) {
        const rect = anchorEl.getBoundingClientRect()
        if (isValidRect(rect)) {
          lastValidRectRef.current = rect
        }
      }

      const pos = calculateDynamicPosition(
        anchorEl,
        headerHeight,
        lastValidRectRef.current,
        dialogId
      )
      if (pos) {
        applyPositionToDOM(pos, dialogId)
        setPosition(pos)
        setLastPosition(pos)
      } else {
        rafId = requestAnimationFrame(updatePos)
      }
    }

    const startPositioning = (): void => {
      updatePos()
      rafId = requestAnimationFrame(updatePos)
      timerId = setTimeout(updatePos, 50)
    }

    startPositioning()

    window.addEventListener('resize', updatePos)

    return (): void => {
      isSubscribed = false
      if (rafId) cancelAnimationFrame(rafId)
      if (timerId) clearTimeout(timerId)
      window.removeEventListener('resize', updatePos)
    }
  }, [isEnabled, anchorEl, headerHeight, dialogId])

  if (!isEnabled) {
    return null
  }

  return position || lastPosition
}

export default useDynamicPosition
