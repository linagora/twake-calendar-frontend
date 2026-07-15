import { Dispatch, SetStateAction } from 'react'

export function handleCopyLink(
  url: URL,
  setCopySnackbarOpen: Dispatch<SetStateAction<boolean>>
) {
  void navigator.clipboard
    .writeText(url.href)
    .then(() => setCopySnackbarOpen(true))
    .catch(err => console.error('Failed to copy booking link:', err))
}
