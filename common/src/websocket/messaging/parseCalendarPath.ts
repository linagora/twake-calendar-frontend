const CALENDAR_PATH_REGEX = /^\/calendars\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/

export function parseCalendarPath(key: unknown): string | null {
  if (typeof key !== 'string' || !CALENDAR_PATH_REGEX.test(key)) {
    return null
  }

  const [, , userId, calendarId] = key.split('/')

  return `${userId}/${calendarId}`
}
