import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { userAttendee } from '@common/features/User/models/attendee'
import { Valarms } from '@common/types/Valarms'
import { Attachment } from '@common/types/Attachment'
import { Resource } from '@common/components/Attendees/ResourceSearch'

const trim = (s: string | undefined): string => (s ?? '').trim()

const attendeeKey = (a: userAttendee): string =>
  `${a.cal_address}|${a.partstat}|${a.role}|${a.cutype}`

const attendeesEqual = (a: userAttendee[], b: userAttendee[]): boolean => {
  if (a.length !== b.length) return false
  const keysA = new Set(a.map(attendeeKey))
  return b.every(x => keysA.has(attendeeKey(x)))
}

const resourceKey = (r: Resource): string =>
  r.email ?? r.openpaasId ?? r.displayName

const resourcesEqual = (a: Resource[], b: Resource[]): boolean => {
  if (a.length !== b.length) return false
  const keysA = new Set(a.map(resourceKey))
  return b.every(x => keysA.has(resourceKey(x)))
}

const attachmentKey = (a: Attachment): string => a.uri

const attachmentsEqual = (a: Attachment[], b: Attachment[]): boolean => {
  if (a.length !== b.length) return false
  const keysA = new Set(a.map(attachmentKey))
  return b.every(x => keysA.has(attachmentKey(x)))
}

const safeStringify = (v: unknown): string => {
  try {
    return JSON.stringify(v ?? null)
  } catch {
    return ''
  }
}

const alarmsKey = (v: Valarms | undefined): string => {
  if (!v) return '[]'
  const alarms = v.getAlarms?.() ?? v
  return safeStringify(alarms)
}

type Check = (
  current: EventFormValues,
  initial: Partial<EventFormValues>
) => boolean

const CHECKS: Check[] = [
  (c, i): boolean => trim(c.title) !== trim(i.title),
  (c, i): boolean => trim(c.description) !== trim(i.description),
  (c, i): boolean => trim(c.location) !== trim(i.location),
  (c, i): boolean => c.start !== (i.start ?? ''),
  (c, i): boolean => c.end !== (i.end ?? ''),
  (c, i): boolean => c.allday !== (i.allday ?? false),
  (c, i): boolean => c.busy !== (i.busy ?? 'OPAQUE'),
  (c, i): boolean => c.eventClass !== (i.eventClass ?? c.eventClass),
  (c, i): boolean => c.timezone !== (i.timezone ?? ''),
  (c, i): boolean => c.calendarid !== (i.calendarid ?? ''),
  (c, i): boolean => c.hasVideoConference !== (i.hasVideoConference ?? false),
  (c, i): boolean => (c.meetingLink ?? null) !== (i.meetingLink ?? null),
  (c, i): boolean =>
    safeStringify(c.repetition ?? {}) !== safeStringify(i.repetition ?? {}),
  (c, i): boolean => !attendeesEqual(c.attendees ?? [], i.attendees ?? []),
  (c, i): boolean => alarmsKey(c.alarms) !== alarmsKey(i.alarms),
  (c, i): boolean => c.organizer?.cal_address !== i.organizer?.cal_address,
  (c, i): boolean =>
    !attachmentsEqual(c.attachments ?? [], i.attachments ?? []),
  (c, i): boolean =>
    !resourcesEqual(c.selectedResources ?? [], i.selectedResources ?? [])
]

export function isEventFormDirty(
  current: EventFormValues,
  initial: Partial<EventFormValues>
): boolean {
  return CHECKS.some(check => check(current, initial))
}
