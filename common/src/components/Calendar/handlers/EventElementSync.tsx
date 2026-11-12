import React, { useLayoutEffect, useRef } from 'react'

interface EventElementSyncProps {
  sync: (eventEl: HTMLElement) => void
  children: React.ReactNode
}

/**
 * Keeps the attributes of the FullCalendar event element current.
 *
 * FullCalendar only calls eventDidMount when it creates the element, yet
 * re-renders the content of the same element when the event changes (an
 * answer, a move, another calendar): the content then brings the element up
 * to date after each render.
 */
export const EventElementSync: React.FC<EventElementSyncProps> = ({
  sync,
  children
}) => {
  const markerRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const eventEl = markerRef.current?.closest<HTMLElement>('.fc-event')
    if (eventEl) sync(eventEl)
  })

  return (
    <>
      {children}
      <span ref={markerRef} hidden />
    </>
  )
}
