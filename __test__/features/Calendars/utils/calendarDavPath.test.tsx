import { encodeDavSegment } from '@linagora/twake-utils'
import {
  calendarDavPath,
  eventDavPath
} from '@common/features/Calendars/utils/calendarDavPath'
import { normalizeCalendar } from '@common/features/Calendars/utils/normalizeCalendar'
import { CalendarData } from '@common/features/Calendars/types/CalendarData'

const OWNER = 'owner1'
const SHAREE = 'sharee1'

function rawCalendar(overrides: Partial<CalendarData>): CalendarData {
  return {
    _links: { self: { href: `/calendars/${OWNER}/cal1` } },
    acl: [],
    _embedded: { 'sync-token': '', 'dav:item': [] },
    ...overrides
  } as CalendarData
}

describe('calendarDavPath', () => {
  it('reads an own calendar from its own node', () => {
    const cal = normalizeCalendar(rawCalendar({}), OWNER)

    expect(calendarDavPath(cal)).toBe(`/calendars/${OWNER}/cal1`)
  })

  it("reads a delegated calendar through the sharee's instance, never the owner's node", () => {
    const cal = normalizeCalendar(
      rawCalendar({
        _links: { self: { href: `/calendars/${SHAREE}/instance1` } },
        'calendarserver:delegatedsource': `/calendars/${OWNER}/cal1`
      }),
      SHAREE
    )

    expect(cal.id).toBe(`${OWNER}/cal1`)
    expect(cal.ownerId).toBe(OWNER)
    expect(calendarDavPath(cal)).toBe(`/calendars/${SHAREE}/instance1`)
  })

  it('reads a public subscription from its source, as before', () => {
    const cal = normalizeCalendar(
      rawCalendar({
        _links: { self: { href: `/calendars/${SHAREE}/subscription1` } },
        'calendarserver:source': {
          _links: { self: { href: `/calendars/${OWNER}/cal1` } }
        }
      }),
      SHAREE
    )

    expect(calendarDavPath(cal)).toBe(`/calendars/${OWNER}/cal1`)
  })

  it('falls back to the id of a delegated calendar that has no link', () => {
    expect(
      calendarDavPath({ id: `${OWNER}/cal1`, link: '', delegated: true })
    ).toBe(`/calendars/${OWNER}/cal1`)
  })
})

describe('eventDavPath', () => {
  it("writes an event of a delegated calendar into the sharee's instance", () => {
    expect(
      eventDavPath(
        {
          id: `${OWNER}/cal1`,
          link: `/calendars/${SHAREE}/instance1`,
          delegated: true
        },
        'event-uid'
      )
    ).toBe(`/calendars/${SHAREE}/instance1/event-uid.ics`)
  })

  it('writes an event of an own calendar into its own node', () => {
    expect(
      eventDavPath(
        { id: `${OWNER}/cal1`, link: `/calendars/${OWNER}/cal1` },
        'event-uid'
      )
    ).toBe(`/calendars/${OWNER}/cal1/event-uid.ics`)
  })

  it('keeps an event UID chosen by someone else within its own segment', () => {
    expect(
      eventDavPath(
        { id: `${OWNER}/cal1`, link: `/calendars/${OWNER}/cal1` },
        '../other/x?y#z'
      )
    ).toBe(`/calendars/${OWNER}/cal1/..%2Fother%2Fx%3Fy%23z.ics`)
  })
})
