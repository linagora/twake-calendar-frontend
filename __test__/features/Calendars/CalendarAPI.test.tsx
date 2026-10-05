import {
  calendarAction,
  calendarIdFromEventHref,
  fetchCalendar,
  fetchCalendarExport,
  fetchCalendars,
  fetchEventByUid,
  fetchSecretLink,
  fetchSyncTokenChanges,
  updateDelegationCalendar
} from '@common/features/Calendars/CalendarDAO'
import { makeAddSharedCalendarBody } from '@common/features/Calendars/transformers'
import { Calendar } from '@common/types/CalendarTypes'
import { api } from '@common/utils/apiUtils'
import { waitFor } from '@testing-library/dom'

jest.mock('@common/utils/apiUtils')

describe('Calendar DAO', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('fetches calendar list for a user', async () => {
    const mockUserId = 'user123'
    const mockResponse = [{ id: 'calendar1' }, { id: 'calendar2' }]

    ;(api.get as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    })

    const calendars = await fetchCalendars(mockUserId)

    expect(api.get).toHaveBeenCalledWith(
      `dav/calendars/${mockUserId}.json?personal=true&sharedDelegationStatus=accepted&sharedPublicSubscription=true&withRights=true`,
      {
        headers: { Accept: 'application/calendar+json' }
      }
    )
    expect(calendars).toEqual(mockResponse)
  })

  it('drops calendar colors that are not hexadecimal colors', async () => {
    ;(api.get as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue({
        _embedded: {
          'dav:calendar': [
            { id: 'safe', 'apple:color': '#A1B2C3' },
            {
              id: 'injected',
              'apple:color': '#fff;}*{background:url(https://evil.example/x)}'
            },
            { id: 'named', 'apple:color': 'red' },
            { id: 'none' }
          ]
        }
      })
    })

    const calendars = await fetchCalendars('user123')

    expect(calendars._embedded['dav:calendar']).toEqual([
      { id: 'safe', 'apple:color': '#A1B2C3' },
      { id: 'injected' },
      { id: 'named' },
      { id: 'none' }
    ])
  })

  it('fetches calendar events for a given ID and match window', async () => {
    const calendarId = 'user1/calendar1'
    const match = { start: '2025-07-01', end: '2025-07-31' }
    const mockCalendarData = { events: ['event1', 'event2'] }

    ;(api as unknown as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue(mockCalendarData)
    })

    const result = await fetchCalendar(
      { id: calendarId, link: `/calendars/${calendarId}.json` },
      match
    )

    expect(api).toHaveBeenCalledWith(`dav/calendars/${calendarId}.json`, {
      method: 'REPORT',
      headers: {
        Accept: 'application/json, text/plain, */*'
      },
      body: JSON.stringify({ match })
    })

    expect(result).toEqual(mockCalendarData)
  })

  it("fetches the events of a delegated calendar through the sharee's instance", async () => {
    const match = { start: '2025-07-01', end: '2025-07-31' }
    ;(api as unknown as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue({})
    })

    await fetchCalendar(
      {
        id: 'owner1/calendar1',
        link: '/calendars/sharee1/instance1.json',
        delegated: true
      },
      match
    )

    expect(api).toHaveBeenCalledWith(
      'dav/calendars/sharee1/instance1.json',
      expect.objectContaining({ method: 'REPORT' })
    )
  })

  it("syncs a delegated calendar through the sharee's instance", async () => {
    ;(api as unknown as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue({})
    })

    await fetchSyncTokenChanges({
      id: 'owner1/calendar1',
      link: '/calendars/sharee1/instance1.json',
      delegated: true,
      syncToken: 'token-1'
    } as Calendar)

    expect(api).toHaveBeenCalledWith('dav/calendars/sharee1/instance1.json', {
      method: 'REPORT',
      headers: { Accept: 'application/json, text/plain, */*' },
      body: JSON.stringify({ 'sync-token': 'token-1' })
    })
  })

  it('syncs an own calendar through its own node', async () => {
    ;(api as unknown as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue({})
    })

    await fetchSyncTokenChanges({
      id: 'user1/calendar1',
      link: '/calendars/user1/calendar1.json',
      syncToken: 'token-1'
    } as Calendar)

    expect(api).toHaveBeenCalledWith(
      'dav/calendars/user1/calendar1.json',
      expect.objectContaining({ method: 'REPORT' })
    )
  })

  it('fetches an event by its UID through a REPORT on the user home', async () => {
    const userId = 'user123'
    const uid = 'event-uid'
    const mockResponse = { _embedded: { 'dav:item': [] } }

    ;(api as unknown as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    })

    const result = await fetchEventByUid(userId, uid)

    expect(api).toHaveBeenCalledWith(`dav/calendars/${userId}.json`, {
      method: 'REPORT',
      headers: {
        Accept: 'application/json, text/plain, */*'
      },
      body: JSON.stringify({ uid }),
      signal: undefined
    })
    expect(result).toEqual(mockResponse)
  })

  it('derives the calendar id from an event href', () => {
    expect(
      calendarIdFromEventHref('/calendars/user123/cal456/event-uid.ics')
    ).toBe('user123/cal456')
  })

  it('postCalendar via calendarAction', async () => {
    const userId = 'userId'
    const body = JSON.stringify({
      id: 'calId',
      'dav:name': 'new cal',
      'apple:color': 'calId',
      'caldav:description': 'desc'
    })

    await calendarAction('POST', `/calendars/${userId}.json`, body)

    expect(api).toHaveBeenCalledWith(`dav/calendars/${userId}.json`, {
      headers: {
        Accept: 'application/json, text/plain, */*'
      },
      method: 'POST',
      body
    })
  })

  it('patch Calendar via calendarAction', async () => {
    const calLink = '/calendars/calId.json'
    const body = JSON.stringify({
      'dav:name': 'new cal',
      'caldav:description': 'desc',
      'apple:color': 'calIdLight'
    })

    await calendarAction('PROPPATCH', calLink, body)

    expect(api).toHaveBeenCalledWith(`dav${calLink}`, {
      method: 'PROPPATCH',
      headers: {
        Accept: 'application/json, text/plain, */*'
      },
      body
    })
  })

  it('remove Calendar via calendarAction', async () => {
    const calLink = '/calendars/calId.json'
    await calendarAction('DELETE', calLink)

    expect(api).toHaveBeenCalledWith(`dav${calLink}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    })
  })

  it('get secret link without reset', async () => {
    const calLink = '/calendars/calId.json'
    ;(api.get as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue({ secretLink: 'link' })
    })

    await expect(fetchSecretLink(calLink, false)).resolves.toEqual({
      secretLink: 'link'
    })

    expect(api.get).toHaveBeenCalledWith(
      `calendar/api${calLink}/secret-link?shouldResetLink=false`,
      {
        headers: {
          Accept: 'application/json, text/plain, */*'
        }
      }
    )
  })
  it('get secret link with reset', async () => {
    const calLink = '/calendars/calId.json'
    ;(api.get as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue('link')
    })
    await fetchSecretLink(calLink, true)

    expect(api.get).toHaveBeenCalledWith(
      `calendar/api${calLink}/secret-link?shouldResetLink=true`,
      {
        headers: {
          Accept: 'application/json, text/plain, */*'
        }
      }
    )
  })

  it('get export data ', async () => {
    const calLink = '/calendars/calId.json'
    ;(api.get as jest.Mock).mockReturnValue({
      text: jest.fn().mockResolvedValue('data')
    })
    await fetchCalendarExport(calLink)

    expect(api.get).toHaveBeenCalledWith(`dav${calLink}?export`, {
      headers: {
        Accept: 'application/calendar'
      }
    })
  })

  it('When adding a sharedCal with #default #default is preserved', async () => {
    const calData = {
      cal: {
        id: 'cal123',
        'dav:name': '#default',
        'apple:color': '#FF5733',
        'caldav:description': 'Default calendar',
        acl: [],
        invite: [],
        _links: {
          self: {
            href: '/calendars/owner123/cal123.json'
          }
        }
      },
      owner: {
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        openpaasId: 'owner123'
      },
      color: '#FF5733'
    }

    const body = makeAddSharedCalendarBody('newCalId123', calData)

    expect(body).toContain('"dav:name":"#default"')
  })

  it('updateDelegationCalendar posts to the correct DAV endpoint with the share body', async () => {
    ;(api.post as jest.Mock).mockResolvedValue({ ok: true })

    const share = {
      set: [{ 'dav:href': 'mailto:alice@example.com', 'dav:read': true }],
      remove: []
    }

    await updateDelegationCalendar('/calendars/user/cal1.json', share)

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        'dav/calendars/user/cal1.json',
        expect.objectContaining({
          body: JSON.stringify({ share })
        })
      )
    )
  })
})
