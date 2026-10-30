import { useEffect } from 'react'
import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'

export const OPEN_CALENDAR_SEARCH = 'calendar:open-search'
export const OPEN_KEYBOARD_SHORTCUTS = 'calendar:keyboard-shortcuts'

export const calendarShortcutRows = [
  ['T', 'menubar.today'],
  ['N / J', 'menubar.next'],
  ['P / K', 'menubar.prev'],
  ['D', 'menubar.views.day'],
  ['W', 'menubar.views.week'],
  ['M', 'menubar.views.month'],
  ['A', 'menubar.views.schedule'],
  ['C', 'event.createEvent'],
  ['/', 'common.search'],
  ['?', 'shortcuts.showList']
] as const

interface CalendarShortcutHandlers {
  enabled: boolean
  onNavigate: (action: 'today' | 'next' | 'prev') => void
  onViewChange: (view: string) => void
  onCreate: () => void
  onSearch: () => void
  onShowHelp: () => void
}

export function useCalendarShortcuts({
  enabled,
  onNavigate,
  onViewChange,
  onCreate,
  onSearch,
  onShowHelp
}: CalendarShortcutHandlers): void {
  useEffect(() => {
    if (!enabled) return
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      )
        return
      const target = event.target instanceof Element ? event.target : null
      if (
        target?.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="listbox"], [role="menu"]'
        ) ||
        document.querySelector(
          '[role="dialog"], [role="alertdialog"], dialog[open]'
        )
      )
        return
      const key = event.key.toLowerCase()
      const views: Record<string, string> = {
        d: CALENDAR_VIEWS.timeGridDay,
        w: CALENDAR_VIEWS.timeGridWeek,
        m: CALENDAR_VIEWS.dayGridMonth,
        a: CALENDAR_VIEWS.listWeek
      }
      const action =
        key === 't'
          ? () => onNavigate('today')
          : key === 'n' || key === 'j'
            ? () => onNavigate('next')
            : key === 'p' || key === 'k'
              ? () => onNavigate('prev')
              : views[key]
                ? () => onViewChange(views[key])
                : key === 'c'
                  ? onCreate
                  : key === '/'
                    ? onSearch
                    : key === '?'
                      ? onShowHelp
                      : undefined
      if (action) {
        event.preventDefault()
        action()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onNavigate, onViewChange, onCreate, onSearch, onShowHelp])
}
