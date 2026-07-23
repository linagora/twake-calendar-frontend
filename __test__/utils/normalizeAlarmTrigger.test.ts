import { VAlarm } from '@common/types/VAlarm'
import { normalizeAlarmTrigger } from '@common/utils/normalizeAlarmTrigger'

describe('normalizeAlarmTrigger', () => {
  it('moves week durations out of the time part', () => {
    expect(normalizeAlarmTrigger('-PT1W')).toBe('-P1W')
  })

  it('moves day durations out of the time part', () => {
    expect(normalizeAlarmTrigger('-PT1D')).toBe('-P1D')
    expect(normalizeAlarmTrigger('-PT2D')).toBe('-P2D')
  })

  it('keeps already standard durations', () => {
    expect(normalizeAlarmTrigger('-P1W')).toBe('-P1W')
    expect(normalizeAlarmTrigger('-P2D')).toBe('-P2D')
  })

  it('keeps time based durations', () => {
    expect(normalizeAlarmTrigger('-PT15M')).toBe('-PT15M')
    expect(normalizeAlarmTrigger('-PT12H')).toBe('-PT12H')
    expect(normalizeAlarmTrigger('PT30S')).toBe('PT30S')
  })

  it('keeps absolute date-time triggers', () => {
    expect(normalizeAlarmTrigger('20260723T100000Z')).toBe('20260723T100000Z')
  })

  it('keeps empty triggers', () => {
    expect(normalizeAlarmTrigger('')).toBe('')
  })
})

describe('VAlarm', () => {
  it('normalizes the trigger it is built with', () => {
    expect(new VAlarm({ trigger: '-PT1W', action: 'EMAIL' }).trigger).toBe(
      '-P1W'
    )
  })

  it('normalizes the trigger of a deserialized alarm', () => {
    expect(VAlarm.fromJSON({ trigger: '-PT2D', action: 'EMAIL' }).trigger).toBe(
      '-P2D'
    )
  })

  it('serializes the normalized trigger to jCal', () => {
    const [, props] = new VAlarm({ trigger: '-PT1W', action: 'EMAIL' }).asJcal()

    expect(props).toContainEqual(['trigger', {}, 'duration', '-P1W'])
  })
})
