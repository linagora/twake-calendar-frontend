import { buildCreateEventRange } from '@common/components/Calendar/utils/createEventRange'

describe('buildCreateEventRange (#1407)', () => {
  const now = new Date('2026-09-24T08:20:00Z')

  it('seeds the event on the displayed day, at the next full hour, in day view', () => {
    const range = buildCreateEventRange(
      'timeGridDay',
      new Date('2026-09-27T00:00:00Z'),
      'UTC',
      now
    )

    expect(range?.start.toISOString()).toBe('2026-09-27T09:00:00.000Z')
    expect(range?.end.toISOString()).toBe('2026-09-27T10:00:00.000Z')
    expect(range?.startStr).toBe('2026-09-27T09:00:00Z')
    expect(range?.allDay).toBe(false)
  })

  it('reads the displayed day and the hour in the zone of the grid', () => {
    const range = buildCreateEventRange(
      'timeGridDay',
      new Date('2026-09-26T11:00:00Z'),
      'Pacific/Tongatapu',
      now
    )

    expect(range?.startStr).toBe('2026-09-27T22:00:00+13:00')
    expect(range?.endStr).toBe('2026-09-27T23:00:00+13:00')
  })

  it('keeps the default when the day view shows today', () => {
    expect(
      buildCreateEventRange(
        'timeGridDay',
        new Date('2026-09-24T00:00:00Z'),
        'UTC',
        now
      )
    ).toBeNull()
  })

  it('follows the displayed week', () => {
    expect(
      buildCreateEventRange(
        'timeGridWeek',
        new Date('2026-09-27T00:00:00Z'),
        'UTC',
        now
      )?.startStr
    ).toBe('2026-09-27T09:00:00Z')
  })

  it('keeps the default when the displayed day is unknown', () => {
    expect(
      buildCreateEventRange('timeGridDay', undefined, 'UTC', now)
    ).toBeNull()
  })
})

describe('Create follows the displayed period (#1827)', () => {
  const now = new Date('2026-10-23T03:30:00Z')
  const workingDays = [1, 2, 3, 4, 5]
  const create = (
    view: string,
    start: string,
    days = workingDays,
    today = now
  ) => buildCreateEventRange(view, new Date(start), 'Europe/Paris', today, days)

  it.each(['timeGridWeek', 'listWeek'])(
    'uses the first working day of a future %s',
    view => {
      const range = create(view, '2026-10-25T23:00:00Z')
      expect(range?.startStr).toBe('2026-10-26T06:00:00+01:00')
      expect(range?.endStr).toBe('2026-10-26T07:00:00+01:00')
    }
  )

  it('skips Monday when it is not a working day', () => {
    expect(
      create('timeGridWeek', '2026-10-25T23:00:00Z', [2, 4])?.startStr
    ).toBe('2026-10-27T06:00:00+01:00')
  })

  it.each(['dayGridMonth', 'listMonth'])(
    'uses November rather than its grey October days in %s',
    view => {
      expect(create(view, '2026-10-31T23:00:00Z')?.startStr).toBe(
        '2026-11-02T06:00:00+01:00'
      )
    }
  )

  it.each(['timeGridWeek', 'listWeek', 'dayGridMonth', 'listMonth'])(
    'keeps today when it is in %s',
    view => {
      const start = view.includes('Month')
        ? '2026-09-30T22:00:00Z'
        : '2026-10-18T22:00:00Z'
      expect(create(view, start)).toBeNull()
    }
  )

  it('falls back to the first day with no working days', () => {
    expect(create('dayGridMonth', '2026-10-31T23:00:00Z', [])?.startStr).toBe(
      '2026-11-01T06:00:00+01:00'
    )
  })

  it('treats the period end as exclusive', () => {
    expect(
      create(
        'timeGridWeek',
        '2026-10-18T22:00:00Z',
        workingDays,
        new Date('2026-10-25T23:00:00Z')
      )?.startStr
    ).toBe('2026-10-19T01:00:00+02:00')
  })
})
