import { Calendar } from '@/features/Calendars/CalendarTypes'
import { RepetitionObject } from '@/features/Events/EventsTypes'
import { userAttendee } from '@/features/User/models/attendee'
import { Resource } from '../Attendees/ResourceSearch'
import { EventFormContext } from '@/utils/eventFormTempStorage'

// ---------------------------------------------------------------------------
// Core value bag — mirrors EventFormState but is the single source of truth
// ---------------------------------------------------------------------------

export interface EventFormValues {
  title: string
  description: string
  location: string
  start: string
  end: string
  allday: boolean
  repetition: RepetitionObject
  attendees: userAttendee[]
  alarm: string
  busy: string
  eventClass: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'
  timezone: string
  calendarid: string
  hasVideoConference: boolean
  meetingLink: string | null
  selectedResources: Resource[]
  // UI-only flags that must survive temp-storage restore
  showDescription: boolean
  showRepeat: boolean
  hasEndDateChanged: boolean
}

export const DEFAULT_FORM_VALUES: EventFormValues = {
  title: '',
  description: '',
  location: '',
  start: '',
  end: '',
  allday: false,
  repetition: {} as RepetitionObject,
  attendees: [],
  alarm: '',
  busy: 'OPAQUE',
  eventClass: 'PUBLIC',
  timezone: '',
  calendarid: '',
  hasVideoConference: false,
  meetingLink: null,
  selectedResources: [],
  showDescription: false,
  showRepeat: false,
  hasEndDateChanged: false
}

// ---------------------------------------------------------------------------
// Imperative handle exposed via forwardRef
// ---------------------------------------------------------------------------

export interface EventFormHandle {
  /** Validate and, if valid, call onSubmit(values). */
  submit: () => Promise<void>
  /** Call onCancel. */
  cancel: () => void
  /** Snapshot of current ref values. */
  getValues: () => EventFormValues
  /** True if the form currently passes validation. */
  isValid: () => boolean
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EventFormFieldsProps {
  /** Seed values — written once into formValuesRef on mount / when isOpen flips true. */
  initialValues: Partial<EventFormValues>

  /** Owned by the modal (controls dialog expand/collapse). */
  showMore: boolean

  isOpen?: boolean
  typeOfAction?: 'solo' | 'all'
  eventId?: string | null

  // Data needed for rendering
  userPersonalCalendars: Calendar[]

  // Save / cancel delegation
  onSubmit: (values: EventFormValues) => Promise<void>
  onCancel: () => void

  // Temp-storage context
  tempStorageKey: 'create' | 'update'
  tempStorageContext?: EventFormContext

  // Optional calendar-preview sync (EventModal live preview)
  onStartChange?: (newStart: string) => void
  onEndChange?: (newEnd: string) => void
  onAllDayChange?: (
    newAllDay: boolean,
    newStart: string,
    newEnd: string
  ) => void

  // Validation notification for parent (e.g. to disable Save button)
  onValidationChange?: (isValid: boolean) => void
}

export interface UseEventFormValuesReturn {
  formValues: EventFormValues
  setFormValues: React.Dispatch<React.SetStateAction<EventFormValues>>
  setTitle: (v: string) => void
  setDescription: (v: string) => void
  setLocation: (v: string) => void
  setStart: (v: string) => void
  setEnd: (v: string) => void
  setAllDay: (v: boolean) => void
  setTimezone: (v: string) => void
  setRepetition: (v: EventFormValues['repetition']) => void
  setAttendees: (v: EventFormValues['attendees']) => void
  setAlarm: (v: string) => void
  setBusy: (v: string) => void
  setEventClass: (v: EventFormValues['eventClass']) => void
  setCalendarid: (v: string) => void
  setHasVideoConference: (v: boolean) => void
  setMeetingLink: (v: string | null) => void
  setSelectedResources: (v: EventFormValues['selectedResources']) => void
  setShowDescription: (v: boolean) => void
  setShowRepeat: (v: boolean) => void
  setHasEndDateChanged: (v: boolean) => void
  handleAllDayChange: (
    newAllDay: boolean,
    newStart: string,
    newEnd: string
  ) => void
}

export interface UseEventFormValuesParams {
  initialValues: Partial<EventFormValues>
  isOpen: boolean
  tempStorageKey: 'create' | 'update'
  tempStorageContext?: EventFormContext
  onStartChange?: (newStart: string) => void
  onEndChange?: (newEnd: string) => void
  onAllDayChange?: (
    newAllDay: boolean,
    newStart: string,
    newEnd: string
  ) => void
}
