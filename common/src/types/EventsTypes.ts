import { Resource } from '@common/components/Attendees/ResourceSearch'
import { Calendar } from '@common/types/CalendarTypes'
import {
  RepetitionRule,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { userAttendee } from '@common/features/User/models/attendee'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { Attachment } from './Attachment'
import { Valarms } from './Valarms'
import { formatUntilForRRule } from '@common/features/Events/utils/formatDateToICal'

export interface CalendarEvent {
  URL: string
  calId: string
  uid: string
  recurrenceId?: string
  transp?: string
  start: string // ISO date string
  end?: string
  class?: 'PRIVATE' | 'PUBLIC' | 'CONFIDENTIAL'
  x_openpass_videoconference?: string
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
}

export interface RepetitionData {
  freq: string
  interval?: number | null
  byday?: string[] | null
  occurrences?: number | null
  endDate?: string | null
  wkst?: string | null
}

export type RepetitionOptions = Partial<RepetitionData>

export class RepetitionObject implements RepetitionData {
  freq: string
  interval?: number | null
  byday?: string[] | null
  occurrences?: number | null
  endDate?: string | null
  wkst?: string | null

  constructor({
    freq,
    interval,
    byday,
    occurrences,
    endDate,
    wkst
  }: RepetitionOptions = {}) {
    this.freq = freq ?? ''
    this.interval = interval
    this.byday = byday
    this.occurrences = occurrences
    this.endDate = endDate
    this.wkst = wkst
  }

  asJcal(allday: boolean, tzid: string): VObjectProperty {
    const repetitionRule: RepetitionRule = { freq: this.freq }
    if (this.interval != null) {
      repetitionRule.interval = this.interval
    }
    if (this.occurrences != null) {
      repetitionRule.count = this.occurrences
    }
    if (this.endDate) {
      repetitionRule.until = formatUntilForRRule(this.endDate, allday, tzid)
    }
    if (this.byday !== null && this.byday !== undefined) {
      repetitionRule.byday = this.byday
    }
    if (this.wkst) {
      repetitionRule.wkst = this.wkst
    }
    return ['rrule', {}, 'recur', repetitionRule]
  }
}

export interface ContextualizedEvent {
  event: CalendarEvent
  calendar: Calendar
  currentUserAttendee: userAttendee | undefined
  isOwn: boolean
  isRecurring: boolean
  isOrganizer: boolean
}
