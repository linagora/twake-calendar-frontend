import { useEffect, useState } from 'react'

export function useVisibleBookingLinks(): string[] {
  const [visibleLinks, setVisibleLinks] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem('visibleBookingLinks') ?? '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'visibleBookingLinks') {
        try {
          setVisibleLinks(JSON.parse(e.newValue ?? '[]'))
        } catch {
          setVisibleLinks([])
        }
      }
    }

    const onLocalChange = (e: CustomEvent<string[]>) => {
      setVisibleLinks(e.detail)
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(
      'visibleBookingLinksChanged',
      onLocalChange as EventListener
    )

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(
        'visibleBookingLinksChanged',
        onLocalChange as EventListener
      )
    }
  }, [])

  return visibleLinks
}
