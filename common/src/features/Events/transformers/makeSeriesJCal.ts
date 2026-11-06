import moment from 'moment-timezone'
import { findTimezoneData } from '@common/utils/timezoneLookup'
import {
  isMomentZone,
  readWallClock,
  resolveKnownTimezone,
  resolveTimezone,
  storedTimezone,
  wallClockOf,
  withStoredTimezones
} from '@common/utils/timezone'
import {
  VCalComponent,
  VObjectProperty,
  VObjectValue
} from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import {
  makeTimezone,
  makeVevent,
  findFieldValue,
  getFieldValues,
  knownZone,
  parseMoment,
  parseInstant
} from '@common/features/Events/utils'
import { VcalendarProperties } from '@common/features/Calendars/types/VcalendarProperties'
import { getTzidParam } from './recurrenceInstant'
import { makeSeriesVtimezones } from './seriesVtimezones'
import { mergeStoredRrule } from './storedRrule'

const METADATA_FIELDS = [
  'summary',
  'description',
  'location',
  'class',
  'transp',
  'attendee',
  'organizer',
  'x-openpaas-videoconference'
] as const

// Participants are shared by the whole series: an override keeps its own
// values only for the descriptive fields
const ALWAYS_PROPAGATED_FIELDS = new Set(['attendee', 'organizer'])

// EXDATE and RDATE are only known from the stored master: the edited event
// comes from an expanded occurrence, which carries neither
const RECURRENCE_SET_FIELDS = new Set(['exdate', 'rdate'])

const WALL_CLOCK_FORMAT = 'YYYY-MM-DDTHH:mm:ss'

// Wall clock time shift of the series, in the zone of the series. Moving a
// series from 10:00 to 11:00 moves every occurrence to 11:00 local time,
// before and after a DST change alike.
interface SeriesShift {
  startMs: number
  endMs: number
}

const NO_SHIFT: SeriesShift = { startMs: 0, endMs: 0 }

// Helper function to serialize for comparison
const serialize = (values: VObjectProperty[] | VCalComponent[]): string =>
  JSON.stringify(values)

const propName = ([name]: VObjectProperty): string => name.toLowerCase()

// Helper function to filter components by name
const filterComponentsByName = (
  components: VCalComponent[],
  name: string
): VCalComponent[] =>
  components.filter(
    ([componentName]) => componentName.toLowerCase() === name.toLowerCase()
  )

// Detect which metadata fields changed between old and new master
const detectChangedMetadataFields = (
  oldMasterProps: VObjectProperty[],
  newMasterProps: VObjectProperty[]
): Map<string, VObjectProperty[]> => {
  const changedFields = new Map<string, VObjectProperty[]>()

  METADATA_FIELDS.forEach(fieldName => {
    const oldValues = getFieldValues(oldMasterProps, fieldName)
    const newValues = getFieldValues(newMasterProps, fieldName)

    if (serialize(oldValues) !== serialize(newValues)) {
      changedFields.set(fieldName.toLowerCase(), newValues)
    }
  })

  return changedFields
}

// Check if VALARM component changed between old and new master
const detectValarmChanges = (
  oldMaster: VCalComponent,
  updatedMaster: VCalComponent
): { valarmChanged: boolean; newValarm: VCalComponent[] } => {
  const oldMasterComponents = oldMaster[2] || []
  const newMasterComponents = updatedMaster[2] || []

  const oldValarm = filterComponentsByName(oldMasterComponents, 'valarm')
  const newValarm = filterComponentsByName(newMasterComponents, 'valarm')

  const valarmChanged = serialize(oldValarm) !== serialize(newValarm)

  return { valarmChanged, newValarm }
}

// An override inherits a field from the series as long as it did not set a
// value of its own, ie it still holds the value of the old master
const inheritsField = (
  props: VObjectProperty[],
  oldMasterProps: VObjectProperty[],
  fieldNameLower: string
): boolean =>
  ALWAYS_PROPAGATED_FIELDS.has(fieldNameLower) ||
  serialize(getFieldValues(props, fieldNameLower)) ===
    serialize(getFieldValues(oldMasterProps, fieldNameLower))

// Apply changed metadata fields to a vevent's properties, keeping the values
// the override customized
const applyMetadataChanges = (
  props: VObjectProperty[],
  oldMasterProps: VObjectProperty[],
  changedFields: Map<string, VObjectProperty[]>
): VObjectProperty[] => {
  let newProps = [...props]

  changedFields.forEach((newValues, fieldNameLower) => {
    if (!inheritsField(props, oldMasterProps, fieldNameLower)) return

    // Remove old values of this changed field from exception
    const filteredProps = newProps.filter(
      prop => propName(prop) !== fieldNameLower
    )

    // Add new values from updated master
    newProps = [...filteredProps, ...newValues]
  })

  return newProps
}

// Increment the sequence number in properties
export const incrementSequenceNumber = (
  props: VObjectProperty[]
): VObjectProperty[] => {
  const newProps = [...props]
  const sequenceIndex = newProps.findIndex(
    ([k]) => k.toLowerCase() === 'sequence'
  )

  if (sequenceIndex !== -1) {
    const currentSequence = parseInt(
      (newProps[sequenceIndex][3] as string) || '0',
      10
    )
    newProps[sequenceIndex] = [
      newProps[sequenceIndex][0],
      newProps[sequenceIndex][1],
      newProps[sequenceIndex][2],
      currentSequence + 1
    ]
  } else {
    newProps.push(['sequence', {}, 'integer', 1])
  }

  return newProps
}

// Update VALARM components if they changed, unless the override has its own
const updateValarmComponents = (
  components: VCalComponent[],
  oldMasterComponents: VCalComponent[],
  newValarm: VCalComponent[]
): VCalComponent[] => {
  const ownValarm = filterComponentsByName(components, 'valarm')
  const oldMasterValarm = filterComponentsByName(oldMasterComponents, 'valarm')
  if (serialize(ownValarm) !== serialize(oldMasterValarm)) return components

  return components
    .filter(([name]) => name.toLowerCase() !== 'valarm')
    .concat(newValarm)
}

// Wall clock reading of an instant in the given zone, as the epoch of that
// same reading in UTC, so that a delta between two readings ignores DST. A
// custom zone is read with its stored VTIMEZONE (see withStoredTimezones)
const wallClockMs = (instant: moment.Moment, tz: string): number =>
  moment.utc(wallClockOf(instant, tz)).valueOf()

const shiftWallClockValue = (
  value: VObjectValue,
  shiftMs: number,
  tz: string
): VObjectValue => {
  if (typeof value !== 'string') return value
  const isUtc = value.endsWith('Z')
  // A TZID or floating value already is a wall clock reading
  const wallClock = isUtc ? wallClockOf(moment.utc(value), tz) : value
  const shifted = moment.utc(wallClock).add(shiftMs, 'ms')
  if (!isUtc) return shifted.format(WALL_CLOCK_FORMAT)

  const instant = readWallClock(shifted.format(WALL_CLOCK_FORMAT), tz)
  return instant.utc().format(`${WALL_CLOCK_FORMAT}[Z]`)
}

// The shift is measured in the zone of the series: a value in another zone moves
// by it there, and stays written in its own zone. Moved in its own wall clock, it
// would not follow the occurrence across a change of offset only one zone has.
const shiftInSeriesZone = (
  value: string,
  shiftMs: number,
  ownZone: string,
  seriesZone: string
): string => {
  const instant = readWallClock(value, ownZone)
  if (!instant.isValid()) return value
  const shifted = moment
    .utc(wallClockOf(instant, seriesZone))
    .add(shiftMs, 'ms')
    .format(WALL_CLOCK_FORMAT)
  return wallClockOf(readWallClock(shifted, seriesZone), ownZone)
}

// A zone a value can be read in: known to moment-timezone, or defined by a
// stored VTIMEZONE (see withStoredTimezones)
const readableZone = (tzid: string | undefined): string | undefined => {
  if (!tzid) return undefined
  const zone = resolveTimezone(tzid)
  if (isMomentZone(zone)) return zone
  return storedTimezone(tzid) ? tzid : undefined
}

// Shift every value of a DATE-TIME property (EXDATE may hold several)
const shiftDateTimeProp = (
  prop: VObjectProperty,
  shiftMs: number,
  tz: string
): VObjectProperty => {
  const [name, params, type, ...values] = prop
  if (shiftMs === 0 || type !== 'date-time') return prop
  const seriesZone = readableZone(tz)
  const ownZone = readableZone(getTzidParam(params))
  return [
    name,
    params,
    type,
    ...values.map(value =>
      ownZone &&
      seriesZone &&
      ownZone !== seriesZone &&
      typeof value === 'string' &&
      !value.endsWith('Z')
        ? shiftInSeriesZone(value, shiftMs, ownZone, seriesZone)
        : shiftWallClockValue(value, shiftMs, tz)
    )
  ] as VObjectProperty
}

// Compute by how much the time of day of the series moves
const computeSeriesShift = (
  oldMaster: VCalComponent,
  event: CalendarEvent,
  tz: string
): SeriesShift => {
  const oldProps = oldMaster[1]
  const oldStart = parseMoment(findFieldValue(oldProps, 'dtstart'), tz)
  if (!oldStart || event.allday || !event.start) return NO_SHIFT

  const startMs =
    wallClockMs(moment(event.start), tz) - wallClockMs(oldStart, tz)
  const oldEnd = parseMoment(findFieldValue(oldProps, 'dtend'), tz)
  const endMs =
    oldEnd && event.end
      ? wallClockMs(moment(event.end), tz) - wallClockMs(oldEnd, tz)
      : startMs

  return { startMs, endMs }
}

// An override moved away from its original slot keeps its own time when the
// series time changes; the others follow the series. Unparseable values fall
// back to a raw comparison, as NaN never equals itself
const isRescheduled = (props: VObjectProperty[], tz: string): boolean => {
  const recurrenceId = findFieldValue(props, 'recurrence-id')
  const start = findFieldValue(props, 'dtstart')
  const recurrenceIdMs = parseInstant(recurrenceId, tz)
  const startMs = parseInstant(start, tz)
  if (Number.isFinite(recurrenceIdMs) && Number.isFinite(startMs)) {
    return recurrenceIdMs !== startMs
  }
  return rawDateTime(recurrenceId) !== rawDateTime(start)
}

const rawDateTime = (prop: VObjectProperty | undefined): unknown =>
  typeof prop?.[3] === 'string' ? prop[3].replace(/Z$/, '') : prop?.[3]

// Re-anchor an override on the moved occurrence: RECURRENCE-ID must match the
// new time of the occurrence it replaces, otherwise it is orphaned
const reanchorOverride = (
  props: VObjectProperty[],
  shift: SeriesShift,
  tz: string
): VObjectProperty[] => {
  if (shift.startMs === 0 && shift.endMs === 0) return props
  const followsSeries = !isRescheduled(props, tz)

  return props.map(prop => {
    switch (propName(prop)) {
      case 'recurrence-id':
        return shiftDateTimeProp(prop, shift.startMs, tz)
      case 'dtstart':
        return followsSeries ? shiftDateTimeProp(prop, shift.startMs, tz) : prop
      case 'dtend':
        return followsSeries ? shiftDateTimeProp(prop, shift.endMs, tz) : prop
      default:
        return prop
    }
  })
}

// Keep the EXDATE / RDATE of the stored master, moved with the series
const withStoredRecurrenceSet = (
  updatedMaster: VCalComponent,
  oldMaster: VCalComponent,
  shift: SeriesShift,
  tz: string
): VCalComponent => {
  const [name, props, ...components] = updatedMaster
  const storedRecurrenceSet = oldMaster[1]
    .filter(prop => RECURRENCE_SET_FIELDS.has(propName(prop)))
    .map(prop => shiftDateTimeProp(prop, shift.startMs, tz))

  return [
    name,
    [
      ...props.filter(prop => !RECURRENCE_SET_FIELDS.has(propName(prop))),
      ...storedRecurrenceSet
    ],
    ...components
  ] as VCalComponent
}

// The rule built from the form only holds the parts the form models: merge it
// with the stored rule so that the other parts are not dropped
const withStoredRrule = (
  updatedMaster: VCalComponent,
  oldMaster: VCalComponent,
  event: CalendarEvent
): VCalComponent => {
  const storedRrule = findFieldValue(oldMaster[1], 'rrule')
  if (!storedRrule) return updatedMaster

  const [name, props, ...components] = updatedMaster
  const tz = event.timezone || 'UTC'
  const rrule = mergeStoredRrule(
    storedRrule,
    findFieldValue(props, 'rrule'),
    event.repetition,
    {
      oldStart: parseMoment(findFieldValue(oldMaster[1], 'dtstart'), tz),
      newStart: parseMoment(findFieldValue(props, 'dtstart'), tz),
      zone: storedTimezone(tz) ? tz : knownZone(tz, 'UTC')
    }
  )

  const hasRrule = props.some(prop => propName(prop) === 'rrule')
  const newProps = hasRrule
    ? props.map(prop => (propName(prop) === 'rrule' ? rrule : prop))
    : [...props, rrule]

  return [name, newProps, ...components] as VCalComponent
}

// Helper to check if a vevent is the source override being dragged
const isSourceOverride = (
  vevent: VCalComponent,
  sourceRecurrenceId?: string,
  sourceTimezone?: string
): boolean => {
  if (!sourceRecurrenceId) return false
  const rid = findFieldValue(vevent[1], 'recurrence-id')
  if (!rid) return false

  const ridMs = parseInstant(rid, 'UTC')
  const srcTzid = sourceTimezone || 'UTC'
  const srcMs = sourceRecurrenceId.endsWith('Z')
    ? moment.utc(sourceRecurrenceId).valueOf()
    : readWallClock(sourceRecurrenceId, srcTzid).valueOf()

  return ridMs === srcMs
}

// Helper to update a single override with metadata changes
type UpdateOverrideParams = {
  vevent: VCalComponent
  oldMaster: VCalComponent
  updatedMaster: VCalComponent
  changedFields: Map<string, VObjectProperty[]>
  valarmChanged: boolean
  newValarm: VCalComponent[]
  shift: SeriesShift
  tz: string
}

const updateOverrideWithMetadata = (
  params: UpdateOverrideParams
): VCalComponent => {
  const {
    vevent,
    oldMaster,
    updatedMaster,
    changedFields,
    valarmChanged,
    newValarm,
    shift,
    tz
  } = params
  const isVeventMaster = !findFieldValue(vevent[1], 'recurrence-id')
  if (isVeventMaster) return updatedMaster

  const [veventType, props, components = []] = vevent

  // Apply metadata changes to remaining overrides
  let newProps = applyMetadataChanges(props, oldMaster[1], changedFields)
  newProps = reanchorOverride(newProps, shift, tz)

  // Increment sequence number if any changes were made
  const shifted = shift.startMs !== 0 || shift.endMs !== 0
  if (changedFields.size > 0 || valarmChanged || shifted) {
    newProps = incrementSequenceNumber(newProps)
  }

  // Handle VALARM component updates
  const updatedComponents = valarmChanged
    ? updateValarmComponents(components, oldMaster[2] || [], newValarm)
    : components

  return [veventType, newProps, updatedComponents] as VCalComponent
}

// Update all vevents with metadata changes while preserving overrides
type UpdateVeventsParams = {
  vevents: VCalComponent[]
  oldMaster: VCalComponent
  updatedMaster: VCalComponent
  masterIndex: number
  sourceRecurrenceId?: string
  shift: SeriesShift
  tz: string
}

const updateVeventsPreservingOverrides = (
  params: UpdateVeventsParams
): VCalComponent[] => {
  const {
    vevents,
    oldMaster,
    updatedMaster,
    masterIndex,
    sourceRecurrenceId,
    shift,
    tz
  } = params
  const oldMasterProps = oldMaster[1]
  const newMasterProps = updatedMaster[1]

  // Detect which fields changed in the master
  const changedFields = detectChangedMetadataFields(
    oldMasterProps,
    newMasterProps
  )

  // Check if VALARM component changed
  const { valarmChanged, newValarm } = detectValarmChanges(
    oldMaster,
    updatedMaster
  )

  const masterWithRecurrenceSet = withStoredRecurrenceSet(
    updatedMaster,
    oldMaster,
    shift,
    tz
  )

  // Update all vevents, removing the source override if identified
  return vevents
    .filter((vevent, index) => {
      if (index === masterIndex) return true
      return !isSourceOverride(vevent, sourceRecurrenceId, tz)
    })
    .map(vevent =>
      updateOverrideWithMetadata({
        vevent,
        oldMaster,
        updatedMaster: masterWithRecurrenceSet,
        changedFields,
        valarmChanged,
        newValarm,
        shift,
        tz
      })
    )
}

export interface MakeSeriesJCalOptions {
  calOwnerEmail?: string
  removeOverrides?: boolean
  sourceRecurrenceId?: string
  // The time of day of the series changed (same day, same rule): overrides,
  // EXDATE and RDATE move along with the occurrences they designate
  followTimeChange?: boolean
  // VTIMEZONE components of the stored calendar object
  storedVtimezones?: VCalComponent[]
}

// The form only offers the zones the browser knows, and shows a custom one in
// UTC (resolveKnownTimezone). A save leaving it there keeps the zone of the
// series: in UTC, a zone with daylight saving would see its occurrences move.
function zoneToWrite(
  event: CalendarEvent,
  oldMaster: VCalComponent,
  storedVtimezones: VCalComponent[]
): string {
  const storedZone = getTzidParam(findFieldValue(oldMaster[1], 'dtstart')?.[1])
  const showsStandIn =
    event.timezone === 'UTC' &&
    storedZone &&
    resolveKnownTimezone(storedZone) === 'UTC'
  const isCustomZone =
    showsStandIn &&
    withStoredTimezones(storedVtimezones, () =>
      Boolean(storedTimezone(storedZone))
    )
  return isCustomZone ? storedZone : event.timezone
}

export const makeSeriesJCal = (
  vevents: VCalComponent[],
  savedEvent: CalendarEvent,
  options: MakeSeriesJCalOptions
): VCalComponent => {
  const removeOverrides = options.removeOverrides ?? true
  const sourceRecurrenceId = options.sourceRecurrenceId
  const masterIndex = vevents.findIndex(
    ([, props]) => !findFieldValue(props, 'recurrence-id')
  )

  if (masterIndex === -1) {
    throw new Error('No master VEVENT found for this series')
  }

  const oldMaster = vevents[masterIndex]

  // The stored VTIMEZONEs are written back: a custom zone keeps its TZID and
  // wall clock instead of being written as UTC. The master, the shift of the
  // series and the overrides it moves are all computed with them
  const storedVtimezones = options.storedVtimezones ?? []
  const tzid = zoneToWrite(savedEvent, oldMaster, storedVtimezones)
  const event = { ...savedEvent, timezone: tzid }
  const finalVevents = withStoredTimezones(storedVtimezones, () => {
    const updatedMaster = withStoredRrule(
      makeVevent(event, tzid, true) as VCalComponent,
      oldMaster,
      event
    )

    if (removeOverrides) {
      // When date/timezone/repeat rules changed, remove all override instances
      return [updatedMaster]
    }
    // Otherwise keep override instances and update their metadata
    const seriesTz = tzid || 'UTC'
    return updateVeventsPreservingOverrides({
      vevents,
      oldMaster,
      updatedMaster,
      masterIndex,
      sourceRecurrenceId,
      shift: options.followTimeChange
        ? computeSeriesShift(oldMaster, event, seriesTz)
        : NO_SHIFT,
      tz: seriesTz
    })
  })

  const vtimezones = makeSeriesVtimezones(
    finalVevents,
    storedVtimezones,
    () =>
      makeTimezone(findTimezoneData(event.timezone), event).component
        .jCal as VCalComponent
  )

  return [
    'vcalendar',
    VcalendarProperties,
    [...finalVevents, ...vtimezones]
  ] as VCalComponent
}
