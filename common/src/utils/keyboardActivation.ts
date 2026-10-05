import type { KeyboardEvent } from 'react'

/**
 * Props making a non-button element operable like a button: focusable, and
 * activated with Enter or Space through the same click handler as the mouse.
 */
export const buttonLikeProps = {
  role: 'button',
  tabIndex: 0,
  onKeyDown: (event: KeyboardEvent<HTMLElement>): void => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.currentTarget.click()
    }
  }
} as const

/** The keys opening a contextual menu: the Menu key, or Shift+F10 */
export const isContextMenuKey = (event: KeyboardEvent): boolean =>
  event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')
