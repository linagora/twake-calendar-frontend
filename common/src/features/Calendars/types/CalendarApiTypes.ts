export interface DavSyncItem {
  status: number
  _links: CalDavLink
}

export class CalDavLink {
  self?: {
    href?: string
  }

  constructor(data?: Partial<CalDavLink>) {
    Object.assign(this, data)
  }

  /**
   * Parses the calendar ID from the link's href.
   * Extracts the ID from paths like '/calendars/user123/cal456.json'
   * @returns The calendar ID or undefined if the href is invalid
   */
  parseCalendarId(): string | undefined {
    const href = this.self?.href
    if (!href) return undefined

    const pathname = href.startsWith('http') ? new URL(href).pathname : href

    const match = pathname.match(/^\/calendars\/(.+)\.json$/)
    return match?.[1]
  }
}

export type CalDavItem = {
  data?: unknown[]
  _links?: CalDavLink
}

export interface DavSyncResponse {
  _embedded?: {
    'dav:item'?: DavSyncItem[]
  }
  'sync-token'?: string
}
