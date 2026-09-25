export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

export interface TimeSlot {
  start: string
  end: string
}

export interface DayAvailability {
  dayOfWeek: DayOfWeek
  enabled: boolean
  slots: TimeSlot[]
}

export const isInvalidSlot = (slot: TimeSlot): boolean =>
  !!slot.start && !!slot.end && slot.start >= slot.end

export const hasInvalidSlot = (rules: DayAvailability[]): boolean =>
  rules.some(rule => rule.enabled && rule.slots.some(isInvalidSlot))

export const DAY_TO_FC: Record<DayOfWeek, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6
}

export const DAYS: DayOfWeek[] = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN'
]
