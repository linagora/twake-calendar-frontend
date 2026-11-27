import { useEffect, useState } from 'react'

const MINUTE = 60 * 1000

// The current time, refreshed at the start of every minute: FullCalendar only
// re-renders its now indicator as time passes, so what depends on the time
// elsewhere in the grid has to re-render from this
export const useCurrentMinute = (): Date => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const scheduleNextMinute = (): void => {
      timeout = setTimeout(
        () => {
          setNow(new Date())
          scheduleNextMinute()
        },
        MINUTE - (Date.now() % MINUTE)
      )
    }
    scheduleNextMinute()
    return () => clearTimeout(timeout)
  }, [])

  return now
}
