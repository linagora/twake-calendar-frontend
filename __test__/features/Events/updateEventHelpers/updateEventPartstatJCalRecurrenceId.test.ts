import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { updateEventPartstatJCal } from '@common/features/Events/transformers/updateEventPartstatJCal'

/**
 * Regression for #1088: accepting/declining a single occurrence that already
 * has a stored exception (e.g. the organiser moved the 3rd occurrence to 4pm)
 * must patch that exception's PARTSTAT in place. The stored RECURRENCE-ID is in
 * TZID wall-clock form while the in-memory recurrenceId can be a bare UTC value;
 * a plain string match missed it, fell back to regeneration and appended a
 * duplicate RECURRENCE-ID that SabreDAV rejects.
 */
function storedJCal(): VCalComponent {
  return [
    'vcalendar',
    [],
    [
      [
        'vevent',
        [
          ['uid', {}, 'text', 'uid-1'],
          [
            'dtstart',
            { tzid: 'Europe/Paris' },
            'date-time',
            '2026-06-22T02:00:00'
          ],
          ['rrule', {}, 'recur', { freq: 'DAILY' }]
        ],
        []
      ],
      [
        'vevent',
        [
          ['uid', {}, 'text', 'uid-1'],
          [
            'recurrence-id',
            { tzid: 'Europe/Paris' },
            'date-time',
            '2026-06-24T02:00:00'
          ],
          [
            'dtstart',
            { tzid: 'Europe/Paris' },
            'date-time',
            '2026-06-24T16:00:00'
          ],
          [
            'attendee',
            { partstat: 'NEEDS-ACTION' },
            'cal-address',
            'mailto:alice@example.com'
          ]
        ],
        []
      ]
    ]
  ]
}

function overrideAttendeePartstat(
  jCal: VCalComponent | null
): string | undefined {
  const exception = (jCal?.[2] as VCalComponent[] | undefined)?.find(
    c =>
      c[0] === 'vevent' &&
      (c[1] as VObjectProperty[]).some(([k]) => k === 'recurrence-id')
  )
  const attendee = (exception?.[1] as VObjectProperty[] | undefined)?.find(
    ([k]) => k === 'attendee'
  )
  return (attendee?.[1] as Record<string, string> | undefined)?.partstat
}

const matchAlice = (_p: Record<string, string>, addr: string): boolean =>
  addr === 'alice@example.com'

describe('updateEventPartstatJCal — RECURRENCE-ID form (#1088)', () => {
  it('patches the override when the in-memory id is a bare UTC value', () => {
    // 02:00 Paris (summer) == 00:00Z: the same occurrence in another form.
    const patched = updateEventPartstatJCal(
      storedJCal(),
      matchAlice,
      'ACCEPTED',
      '2026-06-24T00:00:00Z',
      'Europe/Paris'
    )
    expect(patched).not.toBeNull()
    expect(overrideAttendeePartstat(patched)).toBe('ACCEPTED')
  })

  it('patches the override when the in-memory id is the stored wall-clock value', () => {
    const patched = updateEventPartstatJCal(
      storedJCal(),
      matchAlice,
      'DECLINED',
      '2026-06-24T02:00:00',
      'Europe/Paris'
    )
    expect(patched).not.toBeNull()
    expect(overrideAttendeePartstat(patched)).toBe('DECLINED')
  })

  it('does not match a genuinely different occurrence', () => {
    const patched = updateEventPartstatJCal(
      storedJCal(),
      matchAlice,
      'ACCEPTED',
      '2026-06-25T02:00:00',
      'Europe/Paris'
    )
    expect(patched).toBeNull()
  })
})

describe('updateEventPartstatJCal — Windows TZID RECURRENCE-ID (#1884)', () => {
  const matchUser = (_p: Record<string, string>, addr: string): boolean =>
    addr.toLowerCase() === 'user@example.com'

  function override(
    params: Record<string, string>,
    recurrenceId: string
  ): VCalComponent {
    return [
      'vevent',
      [
        ['uid', {}, 'text', 'series-1'],
        ['recurrence-id', params, 'date-time', recurrenceId],
        [
          'attendee',
          { partstat: 'NEEDS-ACTION' },
          'cal-address',
          'mailto:user@example.com'
        ]
      ],
      []
    ]
  }

  it('matches a Windows TZID RECURRENCE-ID by instant', () => {
    // 09:00 "Romance Standard Time" (Europe/Paris, winter) == 08:00Z
    const jcal: VCalComponent = [
      'vcalendar',
      [],
      [override({ tzid: 'Romance Standard Time' }, '2025-03-24T09:00:00')]
    ]

    const patched = updateEventPartstatJCal(
      jcal,
      matchUser,
      'ACCEPTED',
      '2025-03-24T08:00:00Z',
      'Europe/Paris'
    )

    expect(patched).not.toBeNull()
    expect(overrideAttendeePartstat(patched)).toBe('ACCEPTED')
  })

  it('does not answer another occurrence whose Windows wall clock reads like the UTC value', () => {
    // 18:30 "Samoa Standard Time" (Pacific/Apia, UTC+13) == 05:30Z
    const jcal: VCalComponent = [
      'vcalendar',
      [],
      [
        override({ tzid: 'Samoa Standard Time' }, '2029-12-13T18:30:00'),
        override({}, '2029-12-13T18:30:00Z')
      ]
    ]

    const patched = updateEventPartstatJCal(
      jcal,
      matchUser,
      'DECLINED',
      '2029-12-13T18:30:00Z',
      'Europe/Paris'
    )

    expect(patched![2][0]).toEqual(jcal[2][0])
    expect(patched![2][1]).not.toEqual(jcal[2][1])
  })
})
