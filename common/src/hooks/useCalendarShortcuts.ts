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

function shouldIgnoreKeyEvent(event: KeyboardEvent): boolean {
  return (
    event.defaultPrevented ||
    event.isComposing ||
    event.repeat ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey
  )
}

function isShortcutBlocked(target: EventTarget | null): boolean {
  const element = target instanceof Element ? target : null
  return Boolean(
    element?.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="listbox"], [role="menu"]'
    ) ||
    document.querySelector(
      '[role="dialog"], [role="alertdialog"], dialog[open]'
    )
  )
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
    const next = (): void => onNavigate('next')
    const prev = (): void => onNavigate('prev')
    const actions = new Map<string, () => void>([
      ['t', (): void => onNavigate('today')],
      ['n', next],
      ['j', next],
      ['p', prev],
      ['k', prev],
      ['d', (): void => onViewChange(CALENDAR_VIEWS.timeGridDay)],
      ['w', (): void => onViewChange(CALENDAR_VIEWS.timeGridWeek)],
      ['m', (): void => onViewChange(CALENDAR_VIEWS.dayGridMonth)],
      ['a', (): void => onViewChange(CALENDAR_VIEWS.listWeek)],
      ['c', onCreate],
      ['/', onSearch],
      ['?', onShowHelp]
    ])
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (shouldIgnoreKeyEvent(event) || isShortcutBlocked(event.target)) return
      const action = actions.get(event.key.toLowerCase())
      if (action) {
        event.preventDefault()
        action()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return (): void => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onNavigate, onViewChange, onCreate, onSearch, onShowHelp])
}
