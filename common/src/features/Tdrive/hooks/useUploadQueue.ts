import { useCallback, useEffect, useRef } from 'react'

/**
 * Runs the tasks queued with the returned function, at most `limit` at once,
 * in the order they were queued. Nothing new starts once the caller is gone.
 */
export function useUploadQueue<T>(
  run: (item: T) => Promise<void>,
  limit: number
): (items: T[]) => void {
  const queueRef = useRef<T[]>([])
  const activeCountRef = useRef(0)

  // A task finishing calls back into the queue: it must run the latest task
  const runRef = useRef(run)
  useEffect(() => {
    runRef.current = run
  }, [run])

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return (): void => {
      isMountedRef.current = false
    }
  }, [])

  const startQueued = useCallback((): void => {
    while (isMountedRef.current && activeCountRef.current < limit) {
      const item = queueRef.current.shift()
      if (item === undefined) return
      activeCountRef.current += 1
      void runRef.current(item).finally(() => {
        activeCountRef.current -= 1
        startQueued()
      })
    }
  }, [limit])

  return useCallback(
    (items: T[]): void => {
      queueRef.current.push(...items)
      startQueued()
    },
    [startQueued]
  )
}
