import { useEffect, useMemo, useState } from 'react'
import { useEmbeddedCalendarId } from '@common/features/Embed/embeddedCalendar'

/**
 * The calendars the user shows. An embed route shows its calendar only, and
 * leaves the selection the user keeps for the full application untouched.
 */
export function useSelectedCalendars(): string[] {
  const embeddedCalendarId = useEmbeddedCalendarId()

  const [calendars, setCalendars] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem('selectedCalendars') ?? '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'selectedCalendars') {
        try {
          setCalendars(JSON.parse(e.newValue ?? '[]'))
        } catch {
          setCalendars([])
        }
      }
    }

    const onLocalChange = (e: CustomEvent<string[]>) => {
      setCalendars(e.detail)
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(
      'selectedCalendarsChanged',
      onLocalChange as EventListener
    )

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(
        'selectedCalendarsChanged',
        onLocalChange as EventListener
      )
    }
  }, [])

  return useMemo(
    () => (embeddedCalendarId ? [embeddedCalendarId] : calendars),
    [embeddedCalendarId, calendars]
  )
}
