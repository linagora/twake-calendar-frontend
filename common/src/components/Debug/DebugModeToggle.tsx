import type { JSX } from 'react'
import { useCallback, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { SnackbarAlert } from '@common/components/Loading/SnackBarAlert'
import { useDebugModeShortcut } from '@common/hooks/useDebugModeShortcut'

interface DebugModeNotice {
  id: number
  enabled: boolean
}

/**
 * Listens to the debug mode shortcut and confirms each toggle with a toast.
 * The notice id remounts the snackbar so that a second toggle restarts its
 * auto hide delay.
 */
export function DebugModeToggle(): JSX.Element | null {
  const { t } = useI18n()
  const [notice, setNotice] = useState<DebugModeNotice | null>(null)

  const onToggled = useCallback((enabled: boolean): void => {
    setNotice(previous => ({ id: (previous?.id ?? 0) + 1, enabled }))
  }, [])

  useDebugModeShortcut(onToggled)

  if (!notice) return null

  return (
    <SnackbarAlert
      key={notice.id}
      open
      setOpen={() => setNotice(null)}
      message={t(notice.enabled ? 'debug.enabled' : 'debug.disabled')}
      severity="info"
    />
  )
}

export default DebugModeToggle
