import { useEffect, useState } from 'react'

const STORAGE_KEY = 'showFeatureExplanations'
const CHANGE_EVENT = 'showFeatureExplanationsChanged'

/** Feature explanations are shown unless the user explicitly opted out. */
const parse = (stored: string | null): boolean => stored !== 'false'

export function getShowFeatureExplanations(): boolean {
  try {
    return parse(localStorage.getItem(STORAGE_KEY))
  } catch {
    return true
  }
}

export function setShowFeatureExplanations(show: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(show))

    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: show }))
  } catch (error) {
    console.error('Failed to save feature explanations setting:', error)
  }
}

export function useShowFeatureExplanations(): boolean {
  const [show, setShow] = useState<boolean>(getShowFeatureExplanations)

  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STORAGE_KEY) {
        setShow(parse(e.newValue))
      }
    }

    const onLocalChange = (e: CustomEvent<boolean>): void => {
      setShow(e.detail)
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(CHANGE_EVENT, onLocalChange as EventListener)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CHANGE_EVENT, onLocalChange as EventListener)
    }
  }, [])

  return show
}
