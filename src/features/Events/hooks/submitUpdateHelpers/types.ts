import { AppDispatch } from '@/app/store'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { EventFormValues } from '@/components/Event/EventFormFields.types'
import { EventFormContext } from '@/utils/eventFormTempStorage'

export interface UpdateHelperContext {
  dispatch: AppDispatch
  calId: string
  newEvent: CalendarEvent
  targetCalendar: Calendar
  values: EventFormValues
  tempContext: EventFormContext
}

export interface RecurringUpdateContext extends UpdateHelperContext {
  event: CalendarEvent
  baseUID: string
  typeOfAction?: 'all' | 'solo'
  eventId: string
  masterEvent?: CalendarEvent | null
  getSeriesInstances: () => Record<string, CalendarEvent>
}

export interface PerformUpdateActionParams {
  recurrenceId?: string
  typeOfAction?: 'all' | 'solo'
  dispatch: AppDispatch
  calId: string
  newEvent: CalendarEvent
  targetCalendar: Calendar
  event: CalendarEvent
  values: EventFormValues
  masterEvent?: CalendarEvent | null
  baseUID: string
  getSeriesInstances: () => Record<string, CalendarEvent>
  calList: Record<string, Calendar>
  newCalId: string
  tempContext: EventFormContext
  eventId: string
}

export interface PrepareUpdateDataParams {
  event: CalendarEvent
  values: EventFormValues
  calList: Record<string, Calendar>
  showMore: boolean
  calId: string
  eventId: string
  typeOfAction?: 'all' | 'solo'
}

export interface HandleUpdateSubmitParams extends PrepareUpdateDataParams {
  onClose: (refresh?: boolean) => void
  dispatch: AppDispatch
  masterEvent?: CalendarEvent | null
}

export interface PrepareUpdatedEventParams {
  event: CalendarEvent
  values: EventFormValues
  startISO: string
  endISO: string
  timeChanged: boolean
  targetCalendar: Calendar
  calId: string
  newCalId: string
}

export interface HandleUpdateErrorParams {
  error: unknown
  values: EventFormValues
  tempContext: EventFormContext
  eventId: string
  calId: string
  typeOfAction?: 'all' | 'solo'
  defaultMessage: string
}

export interface PrepareUpdateDataResult {
  targetCalendar: Calendar
  baseUID: string
  recurrenceId?: string
  newEvent: CalendarEvent
  tempContext: EventFormContext
  getSeriesInstances: () => Record<string, CalendarEvent>
  eventId: string
  isConvertingRecurringToSingle: boolean
  newCalId: string
}
