import { Dispatch, SetStateAction } from 'react'

// Embedded in Twake Space, dialogs are drawn in the overlay frame while this
// code runs in the calendar frame. Only the frame that was clicked has the
// focus, and the browser refuses a write from any other one.
export function clipboardOf(element: Element): Clipboard {
  return (element.ownerDocument.defaultView ?? window).navigator.clipboard
}

export function handleCopyLink(
  url: URL,
  setCopySnackbarOpen: Dispatch<SetStateAction<boolean>>,
  clicked: Element
): void {
  void clipboardOf(clicked)
    .writeText(url.href)
    .then(() => setCopySnackbarOpen(true))
    .catch(err => console.error('Failed to copy booking link:', err))
}
