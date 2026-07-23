/**
 * In RFC 5545 durations, the `T` designator only introduces time components
 * (hours, minutes, seconds). Weeks and days belong to the date part, so a one
 * week reminder is `-P1W`, not `-PT1W`.
 *
 * Triggers stored with the misplaced designator are normalized back to the
 * standard form. Anything else (absolute date-time triggers, time based
 * durations) is returned untouched.
 */
const MISPLACED_TIME_DESIGNATOR = /^([+-]?)PT(\d+[WD])$/i

export function normalizeAlarmTrigger(trigger: string): string {
  return trigger.replace(MISPLACED_TIME_DESIGNATOR, '$1P$2')
}
