import { AppDispatch } from '@common/app/store'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { EventFormContext } from '@common/utils/eventFormTempStorage'

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
  recurrenceId?: string
  // Dragging an occurrence moves the series: that occurrence then follows
  // the series, even if it had been customized
  dropSourceOverride?: boolean
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
  organizer?: userOrganiser
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
  organizer?: userOrganiser
  calList: Record<string, Calendar>
  showMore: boolean
  calId: string
  eventId: string
  typeOfAction?: 'all' | 'solo'
  masterEvent?: CalendarEvent | null
  t?: (key: string) => string
}

export interface HandleUpdateSubmitParams extends PrepareUpdateDataParams {
  onClose: (refresh?: boolean) => void
  dispatch: AppDispatch
  masterEvent?: CalendarEvent | null
}

export interface PrepareUpdatedEventParams {
  event: CalendarEvent
  values: EventFormValues
  organizer?: userOrganiser
  startISO: string
  endISO: string
  timeChanged: boolean
  targetCalendar: Calendar
  calId: string
  newCalId: string
  t?: (key: string) => string
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
