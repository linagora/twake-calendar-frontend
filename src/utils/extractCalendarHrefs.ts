export function extractCalendarHrefs(data: unknown): string[] {
  try {
    const calendars = (
      data as {
        _embedded: { 'dav:calendar': { _links: { self: { href: string } } }[] }
      }
    )._embedded['dav:calendar']

    return Array.isArray(calendars)
      ? calendars.map(cal => cal?._links?.self?.href ?? '').filter(Boolean)
      : []
  } catch {
    return []
  }
}
