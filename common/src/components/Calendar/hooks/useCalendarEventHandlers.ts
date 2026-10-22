/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect } from 'react'
import {
  createEventHandlers,
  EventHandlersProps
} from '@common/components/Calendar/handlers/eventHandlers'

export const useCalendarEventHandlers = (
  props: EventHandlersProps
): ReturnType<typeof createEventHandlers> => {
  const eventHandlers = createEventHandlers(props)

  useEffect(() => {
    const handleEventModalError = (e: Event): void => {
      const event = e as CustomEvent<{
        type: 'create' | 'update'
        eventId: string
        calId: string
        typeOfAction: string
      }>
      if (event.detail?.type === 'create') {
        props.setAnchorEl(document.body)
      } else if (event.detail?.type === 'update') {
        try {
          sessionStorage.setItem(
            'eventUpdateModalReopen',
            JSON.stringify({
              eventId: event.detail.eventId,
              calId: event.detail.calId,
              typeOfAction: event.detail.typeOfAction,
              timestamp: Date.now()
            })
          )

          const isCurrentlyDisplayedEvent =
            props.openEventDisplay &&
            props.eventDisplayedId === event.detail.eventId &&
            props.eventDisplayedCalId === event.detail.calId
          if (!isCurrentlyDisplayedEvent) {
            props.setEventDisplayedId(event.detail.eventId)
            props.setEventDisplayedCalId(event.detail.calId)
            props.setEventDisplayedTemp(false)
            props.setOpenEventDisplay(true)
          } else {
            window.dispatchEvent(
              new CustomEvent('eventUpdateModalReopen', {
                detail: {
                  eventId: event.detail.eventId,
                  calId: event.detail.calId,
                  typeOfAction: event.detail.typeOfAction
                }
              })
            )
          }
        } catch {
          // Ignore sessionStorage errors
        }
      }
    }

    window.addEventListener('eventModalError', handleEventModalError)
    return (): void => {
      window.removeEventListener('eventModalError', handleEventModalError)
    }
  }, [
    props.openEventDisplay,
    props.eventDisplayedId,
    props.eventDisplayedCalId,
    props.setAnchorEl,
    props.setOpenEventDisplay,
    props.setEventDisplayedId,
    props.setEventDisplayedCalId,
    props.setEventDisplayedTemp
  ])

  return {
    handleDateSelect: useCallback(eventHandlers.handleDateSelect, [
      props.setSelectedRange,
      props.setAnchorEl,
      props.setTempEvent,
      props.tempUsers,
      props.timezone
    ]),
    handleClosePopover: useCallback(eventHandlers.handleClosePopover, [
      props.calendarRef,
      props.setAnchorEl,
      props.setSelectedRange,
      props.dispatch
    ]),
    handleCloseEventDisplay: useCallback(
      eventHandlers.handleCloseEventDisplay,
      [props.setOpenEventDisplay, props.setAnchorEl]
    ),
    handleEventClick: useCallback(eventHandlers.handleEventClick, [
      props.setAnchorEl,
      props.setOpenEventDisplay,
      props.setEventDisplayedId,
      props.setEventDisplayedCalId,
      props.setEventDisplayedTemp,
      props.calendars,
      props.dispatch,
      props.onEditBookingLink
    ]),
    handleEventAllow: useCallback(eventHandlers.handleEventAllow, []),
    handleEventDrop: useCallback(eventHandlers.handleEventDrop, [
      props.calendars,
      props.dispatch,
      props.setSelectedEvent,
      props.setOpenEditModePopup,
      props.setAfterChoiceFunc
    ]),
    handleEventResize: useCallback(eventHandlers.handleEventResize, [
      props.calendars,
      props.dispatch
    ])
  }
}
