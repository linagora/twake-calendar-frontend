import { useHighContrast } from '@common/features/Settings/Accessibility/highContrastMode'
import type { AlertColor } from '@linagora/twake-mui'

/** Long enough to be read by someone slow to read or to reach it (R-09). */
export const ACCESSIBLE_MESSAGE_DURATION_MS = 10_000

/**
 * How long a message stays on screen. In high contrast mode, errors stay
 * until dismissed and the other messages last at least 10 seconds
 * (RGAA 13.1); otherwise the designed duration applies.
 */
export const useMessageDuration = (
  designedMs: number | null,
  severity: AlertColor = 'info'
): number | null => {
  const highContrast = useHighContrast()
  if (!highContrast) return designedMs
  if (severity === 'error') return null
  return designedMs === null
    ? null
    : Math.max(designedMs, ACCESSIBLE_MESSAGE_DURATION_MS)
}
