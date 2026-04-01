import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { getCalendarDetailAsync } from '@/features/Calendars/services'
import {
  formatDateToYYYYMMDDTHHMMSS,
  getAdjacentWeekRange,
  getViewRange
} from '@/utils/dateUtils'
import { useEffect, useMemo, useRef } from 'react'

export interface Interval {
  start: number
  end: number
}

export function mergeInterval(
  intervals: Interval[],
  next: Interval
): Interval[] {
  const result: Interval[] = []
  let merged = { ...next }
  for (const iv of intervals) {
    if (iv.end < merged.start) result.push(iv)
    else if (iv.start > merged.end) {
      result.push(merged)
      merged = iv
    } else
      merged = {
        start: Math.min(iv.start, merged.start),
        end: Math.max(iv.end, merged.end)
      }
  }
  result.push(merged)
  return result
}

export function subtractIntervals(
  start: number,
  end: number,
  fetched: Interval[]
): Interval[] {
  let remaining: Interval[] = [{ start, end }]
  for (const iv of fetched) {
    const next: Interval[] = []
    for (const r of remaining) {
      if (iv.end <= r.start || iv.start >= r.end) next.push(r)
      else {
        if (iv.start > r.start) next.push({ start: r.start, end: iv.start })
        if (iv.end < r.end) next.push({ start: iv.end, end: r.end })
      }
    }
    remaining = next
  }
  return remaining
}

interface UseCalendarDataLoaderParams {
  selectedDate: Date
  currentView: string
  selectedCalendars: string[]
  sortedSelectedCalendars: string[]
  calendarIds: string[]
  calendarIdsString: string
  tempCalendarIds: string[]
}

export function useCalendarDataLoader({
  selectedDate,
  currentView,
  selectedCalendars,
  sortedSelectedCalendars,
  calendarIds,
  calendarIdsString,
  tempCalendarIds
}: UseCalendarDataLoaderParams) {
  const dispatch = useAppDispatch()
  const calendars = useAppSelector(state => state.calendars.list)

  const { visibleStart, visibleEnd, prefetchEnd } = useMemo(() => {
    const { start, end } = getViewRange(selectedDate, currentView)
    const prefetchEnd =
      currentView === 'dayGridMonth'
        ? end.getTime()
        : getAdjacentWeekRange(selectedDate).end.getTime()
    return {
      visibleStart: start.getTime(),
      visibleEnd: end.getTime(),
      prefetchEnd
    }
  }, [selectedDate, currentView])

  const fetchedIntervalsRef = useRef<Record<string, Interval[]>>({})
  const inFlightRef = useRef<Record<string, Interval[]>>({})
  const tempFetchedIntervalsRef = useRef<Record<string, Interval[]>>({})
  const processedCacheClearRef = useRef<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    const BATCH_SIZE = 5
    const toApiDate = (ms: number) => formatDateToYYYYMMDDTHHMMSS(new Date(ms))

    const run = async () => {
      // Active load: selected calendars, visible range, gaps only
      // Exclude intervals already fetched OR currently in-flight to avoid duplicates.
      const activeUnits = sortedSelectedCalendars.flatMap(id => {
        const fetched = fetchedIntervalsRef.current[id] ?? []
        const inFlight = inFlightRef.current[id] ?? []
        // Build the union of fetched + inFlight intervals to subtract against.
        const covered = inFlight.reduce(
          (acc, iv) => mergeInterval(acc, iv),
          fetched
        )
        return subtractIntervals(visibleStart, visibleEnd, covered).map(
          gap => ({ id, gap })
        )
      })

      activeUnits.forEach(({ id, gap }) => {
        inFlightRef.current[id] = mergeInterval(
          inFlightRef.current[id] ?? [],
          gap
        )
      })

      for (let i = 0; i < activeUnits.length; i += BATCH_SIZE) {
        if (cancelled) return
        await Promise.all(
          activeUnits.slice(i, i + BATCH_SIZE).map(async ({ id, gap }) => {
            try {
              await dispatch(
                getCalendarDetailAsync({
                  calId: id,
                  match: {
                    start: toApiDate(gap.start),
                    end: toApiDate(gap.end)
                  }
                })
              ).unwrap()
              if (!cancelled) {
                // Promote gap from in-flight → fetched.
                fetchedIntervalsRef.current[id] = mergeInterval(
                  fetchedIntervalsRef.current[id] ?? [],
                  gap
                )
              }
            } catch {
              // Remove gap from in-flight so it can be retried.
              inFlightRef.current[id] = (inFlightRef.current[id] ?? []).flatMap(
                iv => {
                  if (iv.end <= gap.start || iv.start >= gap.end) return [iv]
                  const pieces: Interval[] = []
                  if (iv.start < gap.start)
                    pieces.push({ start: iv.start, end: gap.start })
                  if (iv.end > gap.end)
                    pieces.push({ start: gap.end, end: iv.end })
                  return pieces
                }
              )
            }
          })
        )
      }

      if (cancelled) return

      // Prefetch: hidden calendars (visible range) + adjacent week for selected
      const hiddenCalendars = calendarIds.filter(
        id => !selectedCalendars.includes(id)
      )

      const prefetchUnits = [
        ...hiddenCalendars.flatMap(id =>
          subtractIntervals(
            visibleStart,
            visibleEnd,
            fetchedIntervalsRef.current[id] ?? []
          ).map(gap => ({ id, gap }))
        ),
        ...sortedSelectedCalendars.flatMap(id =>
          subtractIntervals(
            visibleEnd,
            prefetchEnd,
            fetchedIntervalsRef.current[id] ?? []
          )
            .filter(gap => gap.start < gap.end)
            .map(gap => ({ id, gap }))
        )
      ]

      const savedGaps = new Map<number, Interval>()
      prefetchUnits.forEach(({ gap }, index) => {
        savedGaps.set(index, { ...gap })
      })

      // Optimistically mark before firing to avoid duplicate kicks
      prefetchUnits.forEach(({ id, gap }) => {
        fetchedIntervalsRef.current[id] = mergeInterval(
          fetchedIntervalsRef.current[id] ?? [],
          gap
        )
      })

      prefetchUnits.forEach(({ id }, index) => {
        const originalGap = savedGaps.get(index) as Interval
        void dispatch(
          getCalendarDetailAsync({
            calId: id,
            match: {
              start: toApiDate(originalGap.start),
              end: toApiDate(originalGap.end)
            }
          })
        )
          .unwrap()
          .catch(() => {
            // Roll back by subtracting the original gap
            fetchedIntervalsRef.current[id] = (
              fetchedIntervalsRef.current[id] ?? []
            ).flatMap(iv => {
              if (iv.end <= originalGap.start || iv.start >= originalGap.end) {
                return [iv] // no overlap, keep as-is
              }
              const pieces: Interval[] = []
              if (iv.start < originalGap.start)
                pieces.push({ start: iv.start, end: originalGap.start })
              if (iv.end > originalGap.end)
                pieces.push({ start: originalGap.end, end: iv.end })
              return pieces
            })
          })
      })
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    visibleStart,
    visibleEnd,
    sortedSelectedCalendars,
    calendarIdsString,
    selectedCalendars,
    prefetchEnd
  ])

  // Cache-clear
  const calendarsWithClearedCache = useMemo(
    () =>
      selectedCalendars
        .map(id => {
          const cleared = calendars[id]?.lastCacheCleared
          return cleared ? { id, cleared } : null
        })
        .filter(Boolean) as { id: string; cleared: number }[],
    [selectedCalendars, calendars]
  )

  useEffect(() => {
    const nonSelectedCalendars = Object.keys(
      fetchedIntervalsRef.current
    ).filter(calId => !selectedCalendars.includes(calId))
    if (nonSelectedCalendars?.length) {
      nonSelectedCalendars.forEach(calId => {
        // Remove these non-selected calendar IDs to ensure these IDs will be fetched again on every subscribe / selection
        delete fetchedIntervalsRef.current[calId]
        delete inFlightRef.current[calId]
      })
    }
  }, [selectedCalendars])

  useEffect(() => {
    const toApiDate = (ms: number) => formatDateToYYYYMMDDTHHMMSS(new Date(ms))
    calendarsWithClearedCache.forEach(({ id, cleared }) => {
      if (processedCacheClearRef.current[id] === cleared) return
      delete fetchedIntervalsRef.current[id]

      void dispatch(
        getCalendarDetailAsync({
          calId: id,
          match: {
            start: toApiDate(visibleStart),
            end: toApiDate(visibleEnd)
          }
        })
      )
        .unwrap()
        .then(() => {
          processedCacheClearRef.current[id] = cleared
          fetchedIntervalsRef.current[id] = mergeInterval(
            fetchedIntervalsRef.current[id] ?? [],
            { start: visibleStart, end: visibleEnd }
          )
          return
        })
        .catch(() => {
          /* leave unrecorded for retry */
        })
    })
  }, [calendarsWithClearedCache, dispatch, visibleStart, visibleEnd])

  // Temp calendars cleanup
  useEffect(() => {
    const currentIds = new Set(tempCalendarIds)
    Object.keys(tempFetchedIntervalsRef.current).forEach(id => {
      if (!currentIds.has(id)) delete tempFetchedIntervalsRef.current[id]
    })
  }, [tempCalendarIds])

  // Temp calendars load
  useEffect(() => {
    if (tempCalendarIds.length === 0) return

    let cancelled = false
    const BATCH_SIZE = 5
    const toApiDate = (ms: number) => formatDateToYYYYMMDDTHHMMSS(new Date(ms))

    const run = async () => {
      const fetchUnits = tempCalendarIds.flatMap(id =>
        subtractIntervals(
          visibleStart,
          visibleEnd,
          tempFetchedIntervalsRef.current[id] ?? []
        ).map(gap => ({ id, gap }))
      )

      for (let i = 0; i < fetchUnits.length; i += BATCH_SIZE) {
        if (cancelled) return
        await Promise.all(
          fetchUnits.slice(i, i + BATCH_SIZE).map(async ({ id, gap }) => {
            try {
              await dispatch(
                getCalendarDetailAsync({
                  calId: id,
                  match: {
                    start: toApiDate(gap.start),
                    end: toApiDate(gap.end)
                  },
                  calType: 'temp'
                })
              ).unwrap()
              if (!cancelled) {
                tempFetchedIntervalsRef.current[id] = mergeInterval(
                  tempFetchedIntervalsRef.current[id] ?? [],
                  gap
                )
              }
            } catch {
              /* leave unrecorded for retry */
            }
          })
        )
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [dispatch, visibleStart, visibleEnd, tempCalendarIds])
}
