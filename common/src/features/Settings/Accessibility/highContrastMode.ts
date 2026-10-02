import { useEffect, useSyncExternalStore } from 'react'

/**
 * "High contrast mode": an opt-in, per device setting (off by default) that
 * turns on every accessibility change with a visible effect — contrast, focus
 * indicator, visible labels, skip link… With the mode off, the interface looks
 * exactly as designed.
 */
export const HIGH_CONTRAST_STORAGE_KEY = 'highContrast'
const CHANGE_EVENT = 'twake-calendar:high-contrast-change'

export const isHighContrastEnabled = (): boolean => {
  try {
    return localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === 'true'
  } catch {
    // storage unavailable (private browsing, blocked cookies): default look
    return false
  }
}

export const setHighContrastEnabled = (enabled: boolean): void => {
  try {
    if (enabled) {
      localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, 'true')
    } else {
      localStorage.removeItem(HIGH_CONTRAST_STORAGE_KEY)
    }
  } catch {
    // not persisted, still applied to this page below
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

const subscribe = (onChange: () => void): (() => void) => {
  const onStorage = (event: StorageEvent): void => {
    if (event.key === HIGH_CONTRAST_STORAGE_KEY) onChange()
  }
  window.addEventListener(CHANGE_EVENT, onChange)
  // another tab of the application toggled it
  window.addEventListener('storage', onStorage)
  return (): void => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export const useHighContrast = (): boolean =>
  useSyncExternalStore(subscribe, isHighContrastEnabled, () => false)

/**
 * Mirrors the mode on `<html data-high-contrast>`, for the stylesheets that
 * are not part of the MUI theme (FullCalendar, .styl files).
 */
export const useHighContrastDocumentAttribute = (): boolean => {
  const enabled = useHighContrast()
  useEffect(() => {
    if (enabled) {
      document.documentElement.setAttribute('data-high-contrast', 'true')
    } else {
      document.documentElement.removeAttribute('data-high-contrast')
    }
  }, [enabled])
  return enabled
}
