import { VObjectProperty } from '@common/features/Calendars/types/CalendarData'
import moment from 'moment-timezone'
import { getTzidParam } from '../transformers/recurrenceInstant'

// Helper function to find a single field value from props
export const findFieldValue = (
  props: VObjectProperty[],
  fieldName: string
): VObjectProperty | undefined =>
  props.find(([k]) => k.toLowerCase() === fieldName.toLowerCase())

// Helper function to get field values from props
export const getFieldValues = (
  props: VObjectProperty[],
  fieldName: string
): VObjectProperty[] =>
  props.filter(([k]) => k.toLowerCase() === fieldName.toLowerCase())

export function parseMoment(
  prop: VObjectProperty | undefined,
  fallbackTimezone: string
): moment.Moment | null {
  if (!prop || typeof prop[3] !== 'string') return null
  const tzid = getTzidParam(prop[1]) || fallbackTimezone
  const val = prop[3]
  const m = val.endsWith('Z') ? moment.utc(val) : moment.tz(val, tzid)
  return m.isValid() ? m : null
}

export function parseInstant(
  prop: VObjectProperty | undefined,
  fallbackTimezone: string
): number {
  const m = parseMoment(prop, fallbackTimezone)
  return m ? m.valueOf() : NaN
}
