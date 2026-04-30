import { CalendarEvent } from '@/features/Events/EventsTypes'
import { makeVevent } from '@/features/Events/utils'

const TZID = 'Europe/Paris'
const OWNER = 'owner@example.com'

/** Pull a property tuple out of vevent[1] by name (case-insensitive). */
function getProp(
  vevent: [string, unknown[]],
  name: string
): unknown[] | undefined {
  return (vevent[1] as unknown[][]).find(
    p => typeof p[0] === 'string' && p[0].toLowerCase() === name.toLowerCase()
  ) as unknown[] | undefined
}

/** Pull every property tuple with a given name (e.g. multiple 'exdate'). */
function getAllProps(vevent: [string, unknown[]], name: string): unknown[][] {
  return (vevent[1] as unknown[][]).filter(
    p => typeof p[0] === 'string' && p[0].toLowerCase() === name.toLowerCase()
  ) as unknown[][]
}

/** Minimal valid CalendarEvent to build on in each test. */
function baseEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    uid: 'base-uuid-1234',
    title: 'Test Event',
    start: '2024-06-01T10:00:00',
    end: '2024-06-01T11:00:00',
    allday: false,
    attendee: [],
    ...overrides
  } as CalendarEvent
}

describe('makeVevent – basic structure', () => {
  it('returns a tuple ["vevent", [...]]', () => {
    const result = makeVevent(baseEvent(), TZID, OWNER)
    expect(result[0]).toBe('vevent')
    expect(Array.isArray(result[1])).toBe(true)
  })

  it('always includes uid, transp, dtstart, class, sequence, summary', () => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    const required = [
      'uid',
      'transp',
      'dtstart',
      'class',
      'sequence',
      'summary'
    ]
    for (const name of required) {
      expect(getProp(vevent, name)).toBeDefined()
    }
  })
})

describe('RFC 5545 – UID', () => {
  it('sets uid to the base UUID (no instance suffix)', () => {
    // extractEventBaseUuid strips any "/<recurrenceId>" suffix
    const event = baseEvent({ uid: 'abc-123/20240601T100000Z' })
    const vevent = makeVevent(event, TZID, OWNER)
    const uid = getProp(vevent, 'uid')
    // The base extractor should strip the suffix; at minimum it must be a string
    expect(typeof uid![3]).toBe('string')
    expect(uid![3]).not.toContain('/') // base UUID should have no suffix
  })

  it('uid value type is "text" (RFC 5545 §3.8.4.7)', () => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    const uid = getProp(vevent, 'uid')
    expect(uid![2]).toBe('text')
  })
})

describe('RFC 5545 – DTSTART', () => {
  it('uses "date-time" value type for timed events', () => {
    const vevent = makeVevent(baseEvent({ allday: false }), TZID, OWNER)
    const dtstart = getProp(vevent, 'dtstart')
    expect(dtstart![2]).toBe('date-time')
  })

  it('uses "date" value type for all-day events', () => {
    const event = baseEvent({ allday: true, start: '2024-06-01' })
    const vevent = makeVevent(event, TZID, OWNER)
    const dtstart = getProp(vevent, 'dtstart')
    expect(dtstart![2]).toBe('date')
  })

  it('carries the TZID parameter for timed events', () => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    const dtstart = getProp(vevent, 'dtstart')
    expect((dtstart![1] as Record<string, string>).tzid).toBe(TZID)
  })
})

describe('RFC 5545 – DTEND', () => {
  it('is included when event.end is set', () => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    expect(getProp(vevent, 'dtend')).toBeDefined()
  })

  it('is omitted when event.end is absent', () => {
    const event = baseEvent({ end: undefined })
    const vevent = makeVevent(event, TZID, OWNER)
    expect(getProp(vevent, 'dtend')).toBeUndefined()
  })

  it('uses "date" value type for all-day events', () => {
    const event = baseEvent({
      allday: true,
      start: '2024-06-01',
      end: '2024-06-02'
    })
    const vevent = makeVevent(event, TZID, OWNER)
    expect(getProp(vevent, 'dtend')![2]).toBe('date')
  })

  it('carries the TZID parameter', () => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    const dtend = getProp(vevent, 'dtend')
    expect((dtend![1] as Record<string, string>).tzid).toBe(TZID)
  })
})

describe('RFC 5545 – CLASS (§3.8.1.3)', () => {
  it('defaults to "PUBLIC" when not provided', () => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    expect(getProp(vevent, 'class')![3]).toBe('PUBLIC')
  })

  it('uses the provided class value', () => {
    const vevent = makeVevent(baseEvent({ class: 'PRIVATE' }), TZID, OWNER)
    expect(getProp(vevent, 'class')![3]).toBe('PRIVATE')
  })
})

describe('RFC 5545 – TRANSP (§3.8.2.7)', () => {
  it('defaults to "OPAQUE"', () => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    expect(getProp(vevent, 'transp')![3]).toBe('OPAQUE')
  })

  it('uses provided transp value "TRANSPARENT"', () => {
    const vevent = makeVevent(baseEvent({ transp: 'TRANSPARENT' }), TZID, OWNER)
    expect(getProp(vevent, 'transp')![3]).toBe('TRANSPARENT')
  })
})

describe('RFC 5545 – SEQUENCE (§3.8.7.4)', () => {
  it('defaults to 1', () => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    expect(getProp(vevent, 'sequence')![3]).toBe(1)
  })

  it('uses the provided sequence number', () => {
    const vevent = makeVevent(baseEvent({ sequence: 5 }), TZID, OWNER)
    expect(getProp(vevent, 'sequence')![3]).toBe(5)
  })

  it('value type is "integer"', () => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    expect(getProp(vevent, 'sequence')![2]).toBe('integer')
  })
})

describe('RFC 5545 – SUMMARY (§3.8.1.12)', () => {
  it('uses event.title', () => {
    const vevent = makeVevent(baseEvent({ title: 'My Meeting' }), TZID, OWNER)
    expect(getProp(vevent, 'summary')![3]).toBe('My Meeting')
  })

  it('falls back to empty string when title is undefined', () => {
    const vevent = makeVevent(baseEvent({ title: undefined }), TZID, OWNER)
    expect(getProp(vevent, 'summary')![3]).toBe('')
  })
})

describe('RFC 5545 – DESCRIPTION (§3.8.1.5)', () => {
  it('is included when provided', () => {
    const vevent = makeVevent(
      baseEvent({ description: 'Details here' }),
      TZID,
      OWNER
    )
    expect(getProp(vevent, 'description')![3]).toBe('Details here')
  })

  it('is omitted when absent', () => {
    const vevent = makeVevent(
      baseEvent({ description: undefined }),
      TZID,
      OWNER
    )
    expect(getProp(vevent, 'description')).toBeUndefined()
  })
})

describe('RFC 5545 – LOCATION (§3.8.1.7)', () => {
  it('is included when provided', () => {
    const vevent = makeVevent(baseEvent({ location: 'Room A' }), TZID, OWNER)
    expect(getProp(vevent, 'location')![3]).toBe('Room A')
  })

  it('is omitted when absent', () => {
    const vevent = makeVevent(baseEvent({ location: undefined }), TZID, OWNER)
    expect(getProp(vevent, 'location')).toBeUndefined()
  })
})

describe('RFC 5545 – ORGANIZER (§3.8.4.3)', () => {
  it('produces a mailto: cal-address', () => {
    const event = baseEvent({
      organizer: { cn: 'Alice', cal_address: 'alice@example.com' }
    })
    const vevent = makeVevent(event, TZID, OWNER)
    const org = getProp(vevent, 'organizer')
    expect(org![3]).toBe('mailto:alice@example.com')
  })

  it('includes the CN parameter', () => {
    const event = baseEvent({
      organizer: { cn: 'Alice', cal_address: 'alice@example.com' }
    })
    const vevent = makeVevent(event, TZID, OWNER)
    const org = getProp(vevent, 'organizer')
    expect((org![1] as Record<string, string>).cn).toBe('Alice')
  })

  it('is omitted when organizer is absent', () => {
    const vevent = makeVevent(baseEvent({ organizer: undefined }), TZID, OWNER)
    expect(getProp(vevent, 'organizer')).toBeUndefined()
  })
})

describe('RFC 5545 – ATTENDEE (§3.8.4.1)', () => {
  it('produces one attendee per entry', () => {
    const event = baseEvent({
      attendee: [
        {
          partstat: 'ACCEPTED',
          rsvp: 'TRUE',
          role: 'REQ-PARTICIPANT',
          cutype: 'INDIVIDUAL',
          cn: 'Bob',
          cal_address: 'bob@example.com'
        },
        {
          partstat: 'NEEDS-ACTION',
          rsvp: 'FALSE',
          role: 'OPT-PARTICIPANT',
          cutype: 'INDIVIDUAL',
          cn: 'Carol',
          cal_address: 'carol@example.com'
        }
      ]
    })
    const vevent = makeVevent(event, TZID, OWNER)
    expect(getAllProps(vevent, 'attendee')).toHaveLength(2)
  })

  it('formats address as mailto:', () => {
    const event = baseEvent({
      attendee: [
        {
          partstat: 'ACCEPTED',
          rsvp: 'TRUE',
          role: 'REQ-PARTICIPANT',
          cutype: 'INDIVIDUAL',
          cn: 'Dave',
          cal_address: 'dave@example.com'
        }
      ]
    })
    const vevent = makeVevent(event, TZID, OWNER)
    const att = getProp(vevent, 'attendee')
    expect(att![3]).toBe('mailto:dave@example.com')
  })

  it('includes partstat, rsvp, role, cutype parameters', () => {
    const event = baseEvent({
      attendee: [
        {
          partstat: 'DECLINED',
          rsvp: 'FALSE',
          role: 'OPT-PARTICIPANT',
          cutype: 'INDIVIDUAL',
          cn: 'Eve',
          cal_address: 'eve@example.com'
        }
      ]
    })
    const vevent = makeVevent(event, TZID, OWNER)
    const params = getProp(vevent, 'attendee')![1] as Record<string, string>
    expect(params.partstat).toBe('DECLINED')
    expect(params.rsvp).toBe('FALSE')
    expect(params.role).toBe('OPT-PARTICIPANT')
    expect(params.cutype).toBe('INDIVIDUAL')
  })

  it('includes CN only when present', () => {
    const withCn = baseEvent({
      attendee: [
        {
          partstat: 'ACCEPTED',
          rsvp: 'TRUE',
          role: 'REQ-PARTICIPANT',
          cutype: 'INDIVIDUAL',
          cn: 'Frank',
          cal_address: 'f@example.com'
        }
      ]
    })
    const withoutCn = baseEvent({
      attendee: [
        {
          partstat: 'ACCEPTED',
          rsvp: 'TRUE',
          role: 'REQ-PARTICIPANT',
          cutype: 'INDIVIDUAL',
          cal_address: 'g@example.com'
        }
      ]
    })

    const v1 = makeVevent(withCn, TZID, OWNER)
    expect((getProp(v1, 'attendee')![1] as Record<string, string>).cn).toBe(
      'Frank'
    )

    const v2 = makeVevent(withoutCn, TZID, OWNER)
    expect(
      (getProp(v2, 'attendee')![1] as Record<string, string>).cn
    ).toBeUndefined()
  })
})

describe('RFC 5545 – RRULE (§3.8.5.3)', () => {
  it('includes rrule when repetition.freq is set', () => {
    const event = baseEvent({ repetition: { freq: 'WEEKLY' } })
    const vevent = makeVevent(event, TZID, OWNER)
    expect(getProp(vevent, 'rrule')).toBeDefined()
  })

  it('omits rrule when repetition is absent', () => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    expect(getProp(vevent, 'rrule')).toBeUndefined()
  })

  it('maps interval correctly', () => {
    const event = baseEvent({ repetition: { freq: 'DAILY', interval: 2 } })
    const vevent = makeVevent(event, TZID, OWNER)
    const rule = getProp(vevent, 'rrule')![3] as Record<string, unknown>
    expect(rule.interval).toBe(2)
  })

  it('maps occurrences to COUNT', () => {
    const event = baseEvent({ repetition: { freq: 'DAILY', occurrences: 10 } })
    const vevent = makeVevent(event, TZID, OWNER)
    const rule = getProp(vevent, 'rrule')![3] as Record<string, unknown>
    expect(rule.count).toBe(10)
  })

  it('maps endDate to UNTIL', () => {
    const event = baseEvent({
      repetition: { freq: 'WEEKLY', endDate: '20241231T000000Z' }
    })
    const vevent = makeVevent(event, TZID, OWNER)
    const rule = getProp(vevent, 'rrule')![3] as Record<string, unknown>
    expect(rule.until).toBe('20241231T000000Z')
  })

  it('maps byday correctly', () => {
    const event = baseEvent({
      repetition: { freq: 'WEEKLY', byday: ['MO', 'WE', 'FR'] }
    })
    const vevent = makeVevent(event, TZID, OWNER)
    const rule = getProp(vevent, 'rrule')![3] as Record<string, unknown>
    expect(rule.byday).toEqual(['MO', 'WE', 'FR'])
  })

  it('omits byday when it is null', () => {
    const event = baseEvent({ repetition: { freq: 'DAILY', byday: null } })
    const vevent = makeVevent(event, TZID, OWNER)
    const rule = getProp(vevent, 'rrule')![3] as Record<string, unknown>
    expect(rule.byday).toBeUndefined()
  })

  it('value type is "recur"', () => {
    const event = baseEvent({ repetition: { freq: 'MONTHLY' } })
    const vevent = makeVevent(event, TZID, OWNER)
    expect(getProp(vevent, 'rrule')![2]).toBe('recur')
  })
})

describe('RFC 5545 – EXDATE (§3.8.5.1)', () => {
  it('adds one exdate per excluded occurrence', () => {
    const event = baseEvent({
      exdates: ['2024-06-08T10:00:00', '2024-06-15T10:00:00']
    })
    const vevent = makeVevent(event, TZID, OWNER)
    expect(getAllProps(vevent, 'exdate')).toHaveLength(2)
  })

  it('exdate value type is "date-time"', () => {
    const event = baseEvent({ exdates: ['2024-06-08T10:00:00'] })
    const vevent = makeVevent(event, TZID, OWNER)
    expect(getProp(vevent, 'exdate')![2]).toBe('date-time')
  })

  it('exdate carries tzid parameter', () => {
    const event = baseEvent({ exdates: ['2024-06-08T10:00:00'] })
    const vevent = makeVevent(event, TZID, OWNER)
    expect((getProp(vevent, 'exdate')![1] as Record<string, string>).tzid).toBe(
      TZID
    )
  })

  it('omits exdate when list is empty', () => {
    const vevent = makeVevent(baseEvent({ exdates: [] }), TZID, OWNER)
    expect(getProp(vevent, 'exdate')).toBeUndefined()
  })
})

describe('RFC 5545 – RECURRENCE-ID (§3.8.4.4)', () => {
  it('is present for an exception event (isMasterEvent=false)', () => {
    const event = baseEvent({ recurrenceId: '2024-06-08T10:00:00' })
    const vevent = makeVevent(event, TZID, OWNER, false)
    expect(getProp(vevent, 'recurrence-id')).toBeDefined()
  })

  it('is absent when isMasterEvent=true', () => {
    const event = baseEvent({ recurrenceId: '2024-06-08T10:00:00' })
    const vevent = makeVevent(event, TZID, OWNER, true)
    expect(getProp(vevent, 'recurrence-id')).toBeUndefined()
  })

  it('carries tzid parameter', () => {
    const event = baseEvent({ recurrenceId: '2024-06-08T10:00:00' })
    const vevent = makeVevent(event, TZID, OWNER, false)
    const rid = getProp(vevent, 'recurrence-id')
    expect((rid![1] as Record<string, string>).tzid).toBe(TZID)
  })
})

describe('VALARM (RFC 5545 §3.6.6)', () => {
  it('is added when alarm.trigger is set', () => {
    const event = baseEvent({
      alarm: { trigger: '-PT15M', action: 'EMAIL' }
    })
    const vevent = makeVevent(event, TZID, OWNER)
    // VALARM is appended as a nested array at the end of vevent
    const valarmEntry = vevent[2]?.find(
      (p: unknown) => Array.isArray(p) && (p as unknown[])[0] === 'valarm'
    )
    expect(valarmEntry).toBeDefined()
  })

  it('is omitted when alarm is absent', () => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    const hasValarm =
      vevent[2]?.some(
        (p: unknown) => Array.isArray(p) && (p as unknown[])[0] === 'valarm'
      ) ?? false
    expect(hasValarm).toBe(false)
  })

  it('alarm attendee points to calendar owner', () => {
    const event = baseEvent({ alarm: { trigger: '-PT10M', action: 'EMAIL' } })
    const vevent = makeVevent(event, TZID, OWNER)
    const valarmEntry = vevent[2]?.find(
      (p: unknown) => Array.isArray(p) && (p as unknown[])[0] === 'valarm'
    )
    const innerProps = valarmEntry[1] as unknown[][]
    const att = innerProps.find(p => p[0] === 'attendee')
    expect(att![3]).toBe(`mailto:${OWNER}`)
  })
})

describe('passthroughProps', () => {
  it('adds unknown props not already present', () => {
    const event = baseEvent({
      passthroughProps: [['x-custom-prop', {}, 'text', 'custom-value']]
    })
    const vevent = makeVevent(event, TZID, OWNER)
    expect(getProp(vevent, 'x-custom-prop')).toBeDefined()
    expect(getProp(vevent, 'x-custom-prop')![3]).toBe('custom-value')
  })

  it('does NOT overwrite existing props', () => {
    const event = baseEvent({
      title: 'Original',
      passthroughProps: [['summary', {}, 'text', 'Injected']]
    })
    const vevent = makeVevent(event, TZID, OWNER)
    // summary must still be the original title
    expect(getProp(vevent, 'summary')![3]).toBe('Original')
  })

  it('is a no-op when passthroughProps is empty', () => {
    const event = baseEvent({ passthroughProps: [] })
    expect(() => makeVevent(event, TZID, OWNER)).not.toThrow()
  })
})

describe('no duplicate core properties', () => {
  const coreProps = [
    'uid',
    'dtstart',
    'dtend',
    'class',
    'transp',
    'sequence',
    'summary'
  ]
  it.each(coreProps)('property "%s" appears exactly once', name => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    expect(getAllProps(vevent, name)).toHaveLength(1)
  })
})

describe('RFC 5545 §3.2.19 – TZID must not appear on DATE values', () => {
  it('DTSTART has no tzid parameter for all-day events', () => {
    const event = baseEvent({ allday: true, start: '2024-06-01' })
    const vevent = makeVevent(event, TZID, OWNER)
    const params = getProp(vevent, 'dtstart')![1] as Record<string, unknown>
    expect(params.tzid).toBeUndefined()
  })

  it('DTSTART carries tzid for timed events', () => {
    const vevent = makeVevent(baseEvent({ allday: false }), TZID, OWNER)
    const params = getProp(vevent, 'dtstart')![1] as Record<string, unknown>
    expect(params.tzid).toBe(TZID)
  })

  it('DTEND has no tzid parameter for all-day events', () => {
    const event = baseEvent({
      allday: true,
      start: '2024-06-01',
      end: '2024-06-02'
    })
    const vevent = makeVevent(event, TZID, OWNER)
    const params = getProp(vevent, 'dtend')![1] as Record<string, unknown>
    expect(params.tzid).toBeUndefined()
  })

  it('DTEND carries tzid for timed events', () => {
    const vevent = makeVevent(baseEvent(), TZID, OWNER)
    const params = getProp(vevent, 'dtend')![1] as Record<string, unknown>
    expect(params.tzid).toBe(TZID)
  })

  it('RECURRENCE-ID has no tzid parameter for all-day exception events', () => {
    const event = baseEvent({
      allday: true,
      start: '2024-06-01',
      recurrenceId: '2024-06-08'
    })
    const vevent = makeVevent(event, TZID, OWNER, false)
    const params = getProp(vevent, 'recurrence-id')![1] as Record<
      string,
      unknown
    >
    expect(params.tzid).toBeUndefined()
  })

  it('RECURRENCE-ID carries tzid for timed exception events', () => {
    const event = baseEvent({ recurrenceId: '2024-06-08T10:00:00' })
    const vevent = makeVevent(event, TZID, OWNER, false)
    const params = getProp(vevent, 'recurrence-id')![1] as Record<
      string,
      unknown
    >
    expect(params.tzid).toBe(TZID)
  })

  it('EXDATE has no tzid parameter for all-day events', () => {
    const event = baseEvent({
      allday: true,
      start: '2024-06-01',
      exdates: ['2024-06-08']
    })
    const vevent = makeVevent(event, TZID, OWNER)
    const params = getProp(vevent, 'exdate')![1] as Record<string, unknown>
    expect(params.tzid).toBeUndefined()
  })

  it('EXDATE carries tzid for timed events', () => {
    const event = baseEvent({ exdates: ['2024-06-08T10:00:00'] })
    const vevent = makeVevent(event, TZID, OWNER)
    const params = getProp(vevent, 'exdate')![1] as Record<string, unknown>
    expect(params.tzid).toBe(TZID)
  })
})

describe('RFC 5545 – RECURRENCE-ID all-day', () => {
  it('uses "date" value type for all-day exception events', () => {
    const event = baseEvent({
      allday: true,
      start: '2024-06-01',
      recurrenceId: '2024-06-08'
    })
    const vevent = makeVevent(event, TZID, OWNER, false)
    expect(getProp(vevent, 'recurrence-id')![2]).toBe('date')
  })

  it('uses "date-time" value type for timed exception events', () => {
    const event = baseEvent({ recurrenceId: '2024-06-08T10:00:00' })
    const vevent = makeVevent(event, TZID, OWNER, false)
    expect(getProp(vevent, 'recurrence-id')![2]).toBe('date-time')
  })
})

describe('RFC 5545 – EXDATE all-day', () => {
  it('uses "date" value type for all-day events', () => {
    const event = baseEvent({
      allday: true,
      start: '2024-06-01',
      exdates: ['2024-06-08']
    })
    const vevent = makeVevent(event, TZID, OWNER)
    expect(getProp(vevent, 'exdate')![2]).toBe('date')
  })

  it('uses "date-time" value type for timed events', () => {
    const event = baseEvent({ exdates: ['2024-06-08T10:00:00'] })
    const vevent = makeVevent(event, TZID, OWNER)
    expect(getProp(vevent, 'exdate')![2]).toBe('date-time')
  })
})
