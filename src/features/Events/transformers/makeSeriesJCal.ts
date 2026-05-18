import moment from 'moment-timezone'
import { TIMEZONES } from '@/utils/timezone-data'
import {
  VCalComponent,
  VObjectProperty
} from '../../Calendars/types/CalendarData'
import { CalendarEvent } from '../EventsTypes'
import { makeTimezone, makeVevent } from '../utils'

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

// Helper function to get field values from props
const getFieldValues = (
  props: VObjectProperty[],
  fieldName: string
): VObjectProperty[] =>
  props.filter(([k]) => k.toLowerCase() === fieldName.toLowerCase())

// Helper function to find a single field value from props
const findFieldValue = (
  props: VObjectProperty[],
  fieldName: string
): VObjectProperty | undefined =>
  props.find(([k]) => k.toLowerCase() === fieldName.toLowerCase())

// Helper function to serialize for comparison
const serialize = (values: VObjectProperty[] | VCalComponent[]): string =>
  JSON.stringify(values)

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

// Apply changed metadata fields to a vevent's properties
const applyMetadataChanges = (
  props: VObjectProperty[],
  changedFields: Map<string, VObjectProperty[]>
): VObjectProperty[] => {
  let newProps = [...props]

  changedFields.forEach((newValues, fieldNameLower) => {
    // Remove old values of this changed field from exception
    const filteredProps = newProps.filter(
      ([k]) => k.toLowerCase() !== fieldNameLower
    )

    // Add new values from updated master
    newProps = [...filteredProps, ...newValues]
  })

  return newProps
}

// Increment the sequence number in properties
const incrementSequenceNumber = (
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

// Update VALARM components if they changed
const updateValarmComponents = (
  components: VCalComponent[],
  newValarm: VCalComponent[]
): VCalComponent[] =>
  components
    .filter(([name]) => name.toLowerCase() !== 'valarm')
    .concat(newValarm)

// Helper to check if a vevent is the source override being dragged
const isSourceOverride = (
  vevent: VCalComponent,
  sourceRecurrenceId?: string,
  sourceTimezone?: string
): boolean => {
  if (!sourceRecurrenceId) return false
  const rid = findFieldValue(vevent[1] as VObjectProperty[], 'recurrence-id')
  if (!rid) return false

  const ridValue = rid[3] as string
  const tzid = (rid[1] as Record<string, string>)?.tzid || 'UTC'
  const ridMs = ridValue.endsWith('Z')
    ? moment.utc(ridValue).valueOf()
    : moment.tz(ridValue, tzid).valueOf()
  const srcTzid = sourceTimezone || 'UTC'
  const srcMs = sourceRecurrenceId.endsWith('Z')
    ? moment.utc(sourceRecurrenceId).valueOf()
    : moment.tz(sourceRecurrenceId, srcTzid).valueOf()

  return ridMs === srcMs
}

// Helper to update a single override with metadata changes
type UpdateOverrideParams = {
  vevent: VCalComponent
  updatedMaster: VCalComponent
  changedFields: Map<string, VObjectProperty[]>
  valarmChanged: boolean
  newValarm: VCalComponent[]
}

const updateOverrideWithMetadata = (
  params: UpdateOverrideParams
): VCalComponent => {
  const { vevent, updatedMaster, changedFields, valarmChanged, newValarm } =
    params
  const isVeventMaster = !findFieldValue(
    vevent[1] as VObjectProperty[],
    'recurrence-id'
  )
  if (isVeventMaster) return updatedMaster

  const [veventType, props, components = []] = vevent

  // Apply metadata changes to remaining overrides
  let newProps = applyMetadataChanges(props as VObjectProperty[], changedFields)

  // Increment sequence number if any changes were made
  if (changedFields.size > 0 || valarmChanged) {
    newProps = incrementSequenceNumber(newProps)
  }

  // Handle VALARM component updates
  const updatedComponents = valarmChanged
    ? updateValarmComponents(components, newValarm)
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
}

const updateVeventsPreservingOverrides = (
  params: UpdateVeventsParams
): VCalComponent[] => {
  const { vevents, oldMaster, updatedMaster, masterIndex, sourceRecurrenceId } =
    params
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

  // Update all vevents, removing the source override if identified
  return vevents
    .filter((vevent, index) => {
      if (index === masterIndex) return true
      return !isSourceOverride(vevent, sourceRecurrenceId)
    })
    .map(vevent =>
      updateOverrideWithMetadata({
        vevent,
        updatedMaster,
        changedFields,
        valarmChanged,
        newValarm
      })
    )
}

export interface MakeSeriesJCalOptions {
  calOwnerEmail?: string
  removeOverrides?: boolean
  sourceRecurrenceId?: string
}

export const makeSeriesJCal = (
  vevents: VCalComponent[],
  event: CalendarEvent,
  options: MakeSeriesJCalOptions
): VCalComponent => {
  const calOwnerEmail = options.calOwnerEmail
  const removeOverrides = options.removeOverrides ?? true
  const sourceRecurrenceId = options.sourceRecurrenceId
  const masterIndex = vevents.findIndex(
    ([, props]) => !findFieldValue(props, 'recurrence-id')
  )

  if (masterIndex === -1) {
    throw new Error('No master VEVENT found for this series')
  }

  const rrule = findFieldValue(vevents[masterIndex][1], 'rrule')
  const tzid = event.timezone
  const oldMaster = vevents[masterIndex]

  const updatedMaster = makeVevent(
    event,
    tzid,
    calOwnerEmail,
    true
  ) as VCalComponent
  const newRrule = findFieldValue(updatedMaster[1], 'rrule')
  if (!newRrule && rrule) {
    updatedMaster[1].push(rrule)
  }

  const timezoneData = TIMEZONES.zones[event.timezone]
  const vtimezone = makeTimezone(timezoneData, event)

  let finalVevents: VCalComponent[]

  if (removeOverrides) {
    // When date/time/timezone/repeat rules changed, remove all override instances
    finalVevents = [updatedMaster]
  } else {
    // When only properties changed, keep override instances and update their metadata
    finalVevents = updateVeventsPreservingOverrides({
      vevents,
      oldMaster,
      updatedMaster,
      masterIndex,
      sourceRecurrenceId
    })
  }

  return [
    'vcalendar',
    [],
    [...finalVevents, vtimezone.component.jCal as VCalComponent]
  ] as VCalComponent
}
