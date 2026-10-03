const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** The day an intent asks for, as `{ date: 'YYYY-MM-DD' }`, in local time. */
export const parseIntentDate = (data: unknown): Date | null => {
  if (!data || typeof data !== 'object') return null
  const value = (data as { date?: unknown }).date
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return null

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const isSameDay =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  return isSameDay ? date : null
}
