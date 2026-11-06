import { AppDispatch } from '@common/app/store'
import { Calendar } from '@common/types/CalendarTypes'
import { DebouncedFunc } from 'lodash'
import { useRef, useState, useCallback } from 'react'
import {
  type ImportResult,
  updateCalendars,
  parseImportResults
} from '../messaging'

export interface CalendarMessageHandler {
  onMessage: (message: unknown) => void
  /** Clears pending delayed refreshes. Pass to `onDisconnect`. */
  dispose: () => void
  /** Import results waiting to be shown, oldest first. */
  importResults: ImportResult[]
  shiftImportResult: () => void
}

export function useCalendarMessageHandler(
  dispatch: AppDispatch
): CalendarMessageHandler {
  const calendarsToRefreshRef = useRef<
    Map<string, { calendar: Calendar; type?: 'temp' }>
  >(new Map())
  const calendarsToHideRef = useRef<Set<string>>(new Set())
  const shouldRefreshCalendarListRef = useRef(false)
  const shouldRefreshBookingLinksRef = useRef(false)
  const debouncedUpdateFnsRef = useRef<
    Map<string, DebouncedFunc<(dispatch: AppDispatch) => void>>
  >(new Map())
  const debouncedListUpdateFnRef = useRef<
    DebouncedFunc<(dispatch: AppDispatch) => void> | undefined
  >(undefined)
  const debouncedBookingLinksUpdateFnRef = useRef<
    DebouncedFunc<(dispatch: AppDispatch) => void> | undefined
  >(undefined)
  const currentDebouncePeriodRef = useRef<number | undefined>(undefined)
  const delayedRefreshTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map())

  const [importResults, setImportResults] = useState<ImportResult[]>([])

  const onMessage = useCallback(
    (message: unknown) => {
      const accumulators = {
        calendarsToRefresh: calendarsToRefreshRef.current,
        calendarsToHide: calendarsToHideRef.current,
        shouldRefreshCalendarListRef,
        shouldRefreshBookingLinksRef,
        debouncedUpdateFns: debouncedUpdateFnsRef.current,
        debouncedListUpdateFn: debouncedListUpdateFnRef.current,
        debouncedBookingLinksUpdateFn: debouncedBookingLinksUpdateFnRef.current,
        currentDebouncePeriod: currentDebouncePeriodRef.current,
        delayedRefreshTimers: delayedRefreshTimersRef.current
      }
      updateCalendars(message, dispatch, accumulators)

      const results = parseImportResults(message)
      if (results.length > 0) {
        setImportResults(previous => [...previous, ...results])
      }

      // Persist mutations back to refs
      debouncedListUpdateFnRef.current = accumulators.debouncedListUpdateFn
      debouncedBookingLinksUpdateFnRef.current =
        accumulators.debouncedBookingLinksUpdateFn
      currentDebouncePeriodRef.current = accumulators.currentDebouncePeriod
    },
    [dispatch]
  )

  const dispose = useCallback(() => {
    delayedRefreshTimersRef.current.forEach(timer => clearTimeout(timer))
    delayedRefreshTimersRef.current.clear()
  }, [])

  const shiftImportResult = useCallback(
    () => setImportResults(previous => previous.slice(1)),
    []
  )

  return { onMessage, dispose, importResults, shiftImportResult }
}
