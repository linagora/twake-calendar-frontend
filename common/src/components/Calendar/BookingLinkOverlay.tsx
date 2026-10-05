import React, {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore
} from 'react'
import type { MutableRefObject } from 'react'
import type { CalendarApi } from '@fullcalendar/core'
import { createPortal } from 'react-dom'
import type { BookingLink } from '@common/features/booking/types/BookingTypes'
import { BaseBookingLinkChip } from '@common/components/Event/EventChip/BookingLinkEventChip'
import {
  computeStripPositions,
  CONTAINER_FIND_DELAY_MS,
  type StripPosition
} from './utils/bookingLinkOverlayUtils'
import { useFilteredBookingLinks } from './hooks/useBookingLinks'
import { useI18n } from 'twake-i18n'

interface BookingLinkOverlayProps {
  visibleBookingLinks: string[] | undefined
  calendarRef: MutableRefObject<CalendarApi | null>
  timezone: string
  currentView: string
  onEditBookingLink?: (link: BookingLink) => void
}

interface BookingLinkStripProps {
  position: StripPosition
  onEdit: (linkId: string) => void
  stripRef: (el: HTMLDivElement | null) => void
}

// Container store
interface ContainerStore {
  element: HTMLElement | null
  listeners: Set<() => void>
}

function createContainerStore(): ContainerStore {
  return { element: null, listeners: new Set() }
}

function subscribeContainer(
  store: ContainerStore,
  callback: () => void
): () => void {
  store.listeners.add(callback)
  return () => store.listeners.delete(callback)
}

function getContainerSnapshot(store: ContainerStore): HTMLElement | null {
  return store.element
}

function setContainerElement(
  store: ContainerStore,
  element: HTMLElement | null
): void {
  store.element = element
  store.listeners.forEach(listener => listener())
}

// Positions store
interface PositionsStore {
  positions: StripPosition[]
  listeners: Set<() => void>
}

function createPositionsStore(): PositionsStore {
  return { positions: [], listeners: new Set() }
}

function subscribePositions(
  store: PositionsStore,
  callback: () => void
): () => void {
  store.listeners.add(callback)
  return () => store.listeners.delete(callback)
}

function getPositionsSnapshot(store: PositionsStore): StripPosition[] {
  return store.positions
}

function setPositions(store: PositionsStore, positions: StripPosition[]): void {
  store.positions = positions
  store.listeners.forEach(listener => listener())
}

function useCalendarContainer(
  calendarRef: MutableRefObject<CalendarApi | null>,
  currentView: string
): HTMLElement | null {
  const storeRef = useRef(createContainerStore())

  const containerEl = useSyncExternalStore(
    useCallback(callback => subscribeContainer(storeRef.current, callback), []),
    useCallback(() => getContainerSnapshot(storeRef.current), [])
  )

  useEffect(() => {
    const store = storeRef.current

    const timeoutId = setTimeout(() => {
      if (!calendarRef.current) {
        setContainerElement(store, null)
        return
      }

      const body = document.querySelector('.fc .fc-timegrid-body')

      setContainerElement(store, body ? (body as HTMLElement) : null)
    }, CONTAINER_FIND_DELAY_MS)

    return (): void => {
      clearTimeout(timeoutId)
    }
  }, [calendarRef, currentView])

  return containerEl
}

function useStripPositions(
  filteredBookingLinks: BookingLink[],
  calendarRef: MutableRefObject<CalendarApi | null>,
  containerEl: HTMLElement | null,
  timezone: string
): StripPosition[] {
  const storeRef = useRef(createPositionsStore())

  const positions = useSyncExternalStore(
    useCallback(callback => subscribePositions(storeRef.current, callback), []),
    useCallback(() => getPositionsSnapshot(storeRef.current), [])
  )

  useEffect(() => {
    const store = storeRef.current

    // Early returns - store already initialized with empty array
    if (!containerEl || !calendarRef.current) {
      return
    }

    const calendarApi = calendarRef.current

    const updatePositions = (): void => {
      const newPositions = computeStripPositions(
        filteredBookingLinks,
        calendarApi,
        containerEl,
        timezone
      )
      setPositions(store, newPositions)
    }

    updatePositions()

    const resizeObserver = new ResizeObserver(updatePositions)
    resizeObserver.observe(containerEl)

    const mutationObserver = new MutationObserver(updatePositions)
    mutationObserver.observe(containerEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-date', 'data-time']
    })

    return (): void => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [filteredBookingLinks, calendarRef, containerEl, timezone])

  return positions
}

function useStripEventHandlers(): (el: HTMLDivElement | null) => void {
  const handlersRef = useRef<Map<HTMLDivElement, (e: MouseEvent) => void>>(
    new Map()
  )

  const stripRef = useCallback((el: HTMLDivElement | null): void => {
    if (!el) {
      // Cleanup removed elements
      handlersRef.current.forEach((handler, element) => {
        if (!document.contains(element)) {
          element.removeEventListener('mousedown', handler, { capture: true })
          handlersRef.current.delete(element)
        }
      })
      return
    }

    // Skip if already registered
    if (handlersRef.current.has(el)) return

    const handler = (e: MouseEvent): void => {
      e.stopPropagation()
    }

    el.addEventListener('mousedown', handler, { capture: true })
    handlersRef.current.set(el, handler)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    const currentHandlers = handlersRef.current
    return (): void => {
      currentHandlers.forEach((handler, element) => {
        element.removeEventListener('mousedown', handler, { capture: true })
      })
      currentHandlers.clear()
    }
  }, [])

  return stripRef
}

const BookingLinkStrip: React.FC<BookingLinkStripProps> = ({
  position,
  onEdit,
  stripRef
}) => {
  const { t } = useI18n()
  const handleActivate = useCallback((): void => {
    if (position.linkId) onEdit(position.linkId)
  }, [onEdit, position.linkId])

  const handleClick = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation()
      handleActivate()
    },
    [handleActivate]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation()
        e.preventDefault()
        handleActivate()
      }
    },
    [handleActivate]
  )

  return (
    <div
      ref={stripRef}
      role="button"
      tabIndex={0}
      aria-label={
        position.linkName
          ? t('a11y.editItem', { name: position.linkName })
          : t('a11y.editBookingLink')
      }
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        height: position.height,
        width: position.width,
        pointerEvents: 'auto',
        zIndex: 2
      }}
    >
      <BaseBookingLinkChip
        data={{
          color: position.color,
          name: position.linkName,
          durationMinutes: position.durationMinutes,
          active: position.active
        }}
        width={`${position.width}px`}
        style={{ height: '100%', minHeight: '100%' }}
      />
    </div>
  )
}

export const BookingLinkOverlay: React.FC<BookingLinkOverlayProps> = ({
  visibleBookingLinks,
  calendarRef,
  timezone,
  currentView,
  onEditBookingLink
}) => {
  const filteredBookingLinks = useFilteredBookingLinks(visibleBookingLinks)
  const containerEl = useCalendarContainer(calendarRef, currentView)
  const positions = useStripPositions(
    filteredBookingLinks,
    calendarRef,
    containerEl,
    timezone
  )
  const stripRef = useStripEventHandlers()

  const findLink = useCallback(
    (linkId: string): BookingLink | undefined => {
      return filteredBookingLinks.find(link => link.publicId === linkId)
    },
    [filteredBookingLinks]
  )

  const handleEdit = useCallback(
    (linkId: string): void => {
      const link = findLink(linkId)
      if (link && onEditBookingLink) {
        onEditBookingLink(link)
      }
    },
    [findLink, onEditBookingLink]
  )

  if (!containerEl || positions.length === 0) return null

  return createPortal(
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1
      }}
    >
      {positions.map(pos => (
        <BookingLinkStrip
          key={pos.ruleId}
          position={pos}
          onEdit={handleEdit}
          stripRef={stripRef}
        />
      ))}
    </div>,
    containerEl
  )
}
