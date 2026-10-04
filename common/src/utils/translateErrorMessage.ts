type Translate = (key: string, params?: Record<string, string>) => string

const TRANSLATION_PREFIX = 'TRANSLATION:'

/**
 * Turns an error message into text for the user. A message may carry a
 * translation key with its parameters instead of text:
 * TRANSLATION:key|param1=value1|param2=value2
 */
export function translateErrorMessage(error: string, t: Translate): string {
  if (!error.startsWith(TRANSLATION_PREFIX)) return error

  const parts = error.substring(TRANSLATION_PREFIX.length).split('|')
  const translationKey = parts[0]
  const params: Record<string, string> = {}

  for (let i = 1; i < parts.length; i++) {
    const equalIndex = parts[i].indexOf('=')
    if (equalIndex === -1) continue
    const key = parts[i].substring(0, equalIndex)
    const value = parts[i].substring(equalIndex + 1)
    if (key && value) {
      try {
        params[key] = decodeURIComponent(value)
      } catch {
        params[key] = value
      }
    }
  }

  return t(translationKey, params)
}
