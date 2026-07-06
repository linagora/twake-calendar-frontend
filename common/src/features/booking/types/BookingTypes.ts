import { User } from '@common/components/Attendees/types'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

export interface WeeklyAvailabilityRule {
  type: 'weekly'
  dayOfWeek: DayOfWeek
  start: string // HH:mm format
  end: string // HH:mm format
  timeZone?: string
}

export interface FixedAvailabilityRule {
  type: 'fixed'
  start: string // yyyy-MM-ddTHH:mm:ss format
  end: string // yyyy-MM-ddTHH:mm:ss format
  timeZone?: string
}

export type AvailabilityRule = WeeklyAvailabilityRule | FixedAvailabilityRule

export interface BookingLink {
  publicId: string
  calendarUrl: string
  durationMinutes: number
  active: boolean
  /** Server defaults to false when omitted on create. */
  autoAccept: boolean
  availabilityRules?: AvailabilityRule[]
  name?: string
  description?: string
}

export interface Slot {
  start: string // ISO-8601 instant
}

export interface BookingSlotsResponse {
  durationMinutes: number
  autoAccept: boolean
  name?: string
  description?: string
  owner: User
  range: {
    from: string
    to: string
  }
  slots: Slot[]
}

export interface BookingCreator {
  email: string
  name?: string
}

export interface BookingAttendee {
  email: string
  name?: string
}

export interface CreateBookingRequest {
  startUtc: string
  creator: BookingCreator
  additional_attendees?: BookingAttendee[]
  eventTitle: string
  visioLink?: boolean
  notes?: string
}

export interface CreateBookingLinkRequest {
  calendarUrl: string
  durationMinutes: number
  active: boolean
  autoAccept?: boolean
  availabilityRules?: AvailabilityRule[]
  name?: string
  description?: string
}

export interface CreateBookingLinkResponse {
  bookingLinkPublicId: string
}

export interface UpdateBookingLinkRequest {
  calendarUrl?: string
  durationMinutes?: number
  active?: boolean
  autoAccept?: boolean
  /**
   * Set to null to clear this field.
   * Omit to leave unchanged.
   */
  availabilityRules?: AvailabilityRule[] | null
  /**
   * Set to null or blank to clear this field.
   * Omit to leave unchanged.
   */
  name?: string | null
  /**
   * Set to null or blank to clear this field.
   * Omit to leave unchanged.
   */
  description?: string | null
}

export interface CreateBookingResponse {
  bookingConfirmationToken: string
}

export interface ResetBookingLinkResponse {
  bookingLinkPublicId: string
}

export interface BookedEventResponse {
  eventJSON: VCalComponent // jCal format (RFC 7265)
}
