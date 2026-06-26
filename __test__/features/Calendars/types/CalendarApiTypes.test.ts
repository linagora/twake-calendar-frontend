import { CalDavLink } from '@common/features/Calendars/types/CalendarApiTypes'

describe('CalDavLink', () => {
  describe('parseCalendarId', () => {
    it('extracts calendar ID from simple path', () => {
      const link = new CalDavLink({
        self: { href: '/calendars/user123/cal456.json' }
      })
      expect(link.parseCalendarId()).toBe('user123/cal456')
    })

    it('extracts calendar ID from full URL', () => {
      const link = new CalDavLink({
        self: { href: 'https://example.com/calendars/user123/cal456.json' }
      })
      expect(link.parseCalendarId()).toBe('user123/cal456')
    })

    it('returns undefined when href is missing', () => {
      const link = new CalDavLink({})
      expect(link.parseCalendarId()).toBeUndefined()
    })

    it('returns undefined when self is missing', () => {
      const link = new CalDavLink({})
      expect(link.parseCalendarId()).toBeUndefined()
    })

    it('returns undefined for invalid path format', () => {
      const link = new CalDavLink({ self: { href: '/invalid/path.json' } })
      expect(link.parseCalendarId()).toBeUndefined()
    })

    it('handles complex calendar IDs with multiple slashes', () => {
      const link = new CalDavLink({
        self: { href: '/calendars/user@domain.com/calendar/shared.json' }
      })
      expect(link.parseCalendarId()).toBe('user@domain.com/calendar/shared')
    })

    it('handles URL with port', () => {
      const link = new CalDavLink({
        self: { href: 'https://example.com:8080/calendars/user123/cal456.json' }
      })
      expect(link.parseCalendarId()).toBe('user123/cal456')
    })
  })

  describe('getFirstSubId', () => {
    it('extracts resource ID from simple path', () => {
      const link = new CalDavLink({
        self: { href: '/calendars/user123/cal456.json' }
      })
      expect(link.getFirstSubId()).toBe('user123')
    })

    it('extracts resource ID from complex path', () => {
      const link = new CalDavLink({
        self: { href: '/calendars/user@domain.com/calendar/shared.json' }
      })
      expect(link.getFirstSubId()).toBe('user@domain.com')
    })

    it('returns undefined when href is missing', () => {
      const link = new CalDavLink({})
      expect(link.getFirstSubId()).toBeUndefined()
    })

    it('returns undefined for invalid path format', () => {
      const link = new CalDavLink({ self: { href: '/invalid/path.json' } })
      expect(link.getFirstSubId()).toBeUndefined()
    })

    it('handles full URL', () => {
      const link = new CalDavLink({
        self: { href: 'https://example.com/calendars/user123/cal456.json' }
      })
      expect(link.getFirstSubId()).toBe('user123')
    })
  })

  describe('static parseCalendarIdFromHref', () => {
    it('extracts calendar ID from href string', () => {
      expect(
        CalDavLink.parseCalendarIdFromHref('/calendars/user123/cal456.json')
      ).toBe('user123/cal456')
    })

    it('returns undefined for undefined href', () => {
      expect(CalDavLink.parseCalendarIdFromHref(undefined)).toBeUndefined()
    })

    it('returns undefined for invalid href', () => {
      expect(
        CalDavLink.parseCalendarIdFromHref('/invalid/path')
      ).toBeUndefined()
    })
  })

  describe('static getFirstIdFromHref', () => {
    it('extracts resource ID from href string', () => {
      expect(
        CalDavLink.getFirstIdFromHref('/calendars/user123/cal456.json')
      ).toBe('user123')
    })

    it('returns undefined for undefined href', () => {
      expect(CalDavLink.getFirstIdFromHref(undefined)).toBeUndefined()
    })

    it('returns undefined for invalid href', () => {
      expect(CalDavLink.getFirstIdFromHref('/invalid/path')).toBeUndefined()
    })
  })

  describe('constructor', () => {
    it('creates instance with data', () => {
      const link = new CalDavLink({
        self: { href: '/calendars/user/cal.json' }
      })
      expect(link.self?.href).toBe('/calendars/user/cal.json')
    })

    it('creates empty instance when no data provided', () => {
      const link = new CalDavLink()
      expect(link.self).toBeUndefined()
    })

    it('partially assigns data', () => {
      const link = new CalDavLink({ self: {} })
      expect(link.self).toEqual({})
      expect(link.self?.href).toBeUndefined()
    })
  })
})
