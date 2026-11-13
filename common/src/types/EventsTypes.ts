import { Resource } from '@common/components/Attendees/ResourceSearch'
import { Calendar } from '@common/types/CalendarTypes'
import { VObjectProperty } from '@common/features/Calendars/types/CalendarData'
import { userAttendee } from '@common/features/User/models/attendee'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { Attachment } from './Attachment'
import { Valarms } from './Valarms'
import { RepetitionObject } from './Repetition'

export interface CalendarEvent {
  URL: string
  calId: string
  uid: string
  recurrenceId?: string
  // The TZID of the stored RECURRENCE-ID, which recurrenceId drops. See #2067.
  recurrenceTzid?: string
  transp?: string
  start: string // ISO date string
  end?: string
  // Set when the stored timed event had neither DTEND nor DURATION: it ends
  // when it starts (RFC 5545 §3.6.1) and `end` is only a display convenience.
  // Holds the dates as read, so that a save leaving them untouched writes no
  // DTEND. See #2108.
  implicitEnd?: { start: string; end: string }
  class?: 'PRIVATE' | 'PUBLIC' | 'CONFIDENTIAL'
  x_openpass_videoconference?: string
  bookingLinkPublicId?: string
  title?: string
  description?: string
  location?: string
  organizer?: userOrganiser
  attendee: userAttendee[]
  stamp?: string
  sequence?: number
  color?: Record<string, string>
  allday?: boolean
  error?: string
  status?: string
  timezone: string
  repetition?: RepetitionObject
  alarms?: Valarms
  exdates?: string[]
  passthroughProps?: VObjectProperty[]
  selectedResources?: Resource[]
  attach?: Attachment[]
  teamCalendarId?: string
}

export interface ContextualizedEvent {
  event: CalendarEvent
  calendar: Calendar
  currentUserAttendee: userAttendee | undefined
  isOwn: boolean
  isRecurring: boolean
  isOrganizer: boolean
}
