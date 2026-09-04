const MAX_DURATION_LENGTH = 64

/**
 * Parses an ISO 8601 duration string (e.g., -PT20M, -PT1H, P1D, -PT15M)
 * and formats it using the translation function `t`.
 */
export function translateDuration(
  durationStr: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  // RFC 5545 durations are a couple of dozen characters at most. The unit
  // lookups below are unanchored `(\d+)X` scans, which backtrack quadratically
  // over a long digit run, so refuse oversized input rather than parse it.
  if (durationStr.length > MAX_DURATION_LENGTH) {
    return durationStr
  }

  // First, check if there is an exact translation key matching this trigger
  const exactKey = `event.form.notifications.${durationStr}`
  const exactTranslation = t(exactKey)
  if (exactTranslation !== exactKey) {
    return exactTranslation
  }

  // Parse ISO 8601 duration
  // Standard duration starts with P, optionally preceded by a sign
  if (!/^[+-]?P/i.test(durationStr)) {
    return durationStr
  }

  const isNegative = durationStr.startsWith('-')
  const suffix = isNegative ? 'before' : 'after'
  const parts: string[] = []

  const parseUnit = (regex: RegExp): number => {
    const match = durationStr.match(regex)
    return match ? parseInt(match[1], 10) : 0
  }

  const unitsData = [
    { key: 'week', val: parseUnit(/(\d+)W/i) },
    { key: 'day', val: parseUnit(/(\d+)D/i) },
    { key: 'hour', val: parseUnit(/(\d+)H/i) },
    { key: 'minute', val: parseUnit(/(\d+)M/i) },
    { key: 'second', val: parseUnit(/(\d+)S/i) }
  ]

  for (const { key, val } of unitsData) {
    if (val > 0) {
      const translationKey = `event.form.notifications.${key}${val === 1 ? '' : 's'}`
      parts.push(t(translationKey, { count: val }))
    }
  }

  if (parts.length > 0) {
    const durationText = parts.join(' ')
    const wrapperKey = `event.form.notifications.duration_${suffix}`
    return t(wrapperKey, { duration: durationText })
  }

  return durationStr
}

export const translateAlarmAction = (
  action: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string => {
  if (!action) return ''
  const translationKey = `event.form.notifications.${action}`
  const translated = t(translationKey)
  return translated === translationKey ? action : translated
}
