import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_FORM_VALUES,
  EventFormValues,
  UseEventFormValuesParams,
  UseEventFormValuesReturn
} from '../EventFormFields.types'
import {
  restoreEventFormDataFromTemp,
  saveEventFormDataToTemp,
  EventFormTempData,
  EventFormContext
} from '@/utils/eventFormTempStorage'

function isTempDataValidForContext(
  tempData: EventFormTempData | null,
  context: EventFormContext | undefined
): tempData is EventFormTempData {
  if (!tempData?.fromError) return false
  if (!context) return true

  return (
    tempData.eventId === context.eventId &&
    tempData.calId === context.calId &&
    tempData.typeOfAction === context.typeOfAction
  )
}

function mapTempDataToFormValues(
  tempData: EventFormTempData
): Partial<EventFormValues> {
  return {
    title: tempData.title,
    description: tempData.description,
    location: tempData.location,
    start: tempData.start,
    end: tempData.end,
    allday: tempData.allday,
    repetition: tempData.repetition,
    attendees: tempData.attendees,
    alarm: tempData.alarm,
    busy: tempData.busy,
    eventClass: tempData.eventClass,
    timezone: tempData.timezone,
    calendarid: tempData.calendarid,
    hasVideoConference: tempData.hasVideoConference,
    meetingLink: tempData.meetingLink,
    selectedResources: tempData.resources ?? [],
    showDescription: tempData.showDescription ?? false,
    showRepeat: tempData.showRepeat ?? false,
    hasEndDateChanged: tempData.hasEndDateChanged ?? false
  }
}

function useEventFormSeeding(
  isOpen: boolean,
  tempStorageKey: 'create' | 'update',
  tempStorageContext: EventFormContext | undefined,
  initialValues: Partial<EventFormValues>,
  setFormValues: React.Dispatch<React.SetStateAction<EventFormValues>>
): void {
  const prevIsOpenRef = useRef(false)
  useEffect(() => {
    const seedForm = (): void => {
      const isOpening = isOpen && !prevIsOpenRef.current
      prevIsOpenRef.current = isOpen
      if (!isOpening) return

      const tempData = restoreEventFormDataFromTemp(tempStorageKey)

      if (isTempDataValidForContext(tempData, tempStorageContext)) {
        setFormValues({
          ...DEFAULT_FORM_VALUES,
          ...mapTempDataToFormValues(tempData)
        })
        saveEventFormDataToTemp(tempStorageKey, {
          ...tempData,
          fromError: false
        })
      } else {
        setFormValues({ ...DEFAULT_FORM_VALUES, ...initialValues })
      }
    }
    seedForm()
  }, [isOpen, tempStorageKey, tempStorageContext, initialValues, setFormValues])
}

function useEventFormSetters(
  set: <K extends keyof EventFormValues>(
    key: K,
    value: EventFormValues[K]
  ) => void,
  setFormValues: React.Dispatch<React.SetStateAction<EventFormValues>>,
  onStartChange?: (v: string) => void,
  onEndChange?: (v: string) => void,
  onAllDayChange?: (
    newAllDay: boolean,
    newStart: string,
    newEnd: string
  ) => void
): {
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
} {
  const setTitle = useCallback((v: string) => set('title', v), [set])
  const setDescription = useCallback(
    (v: string) => set('description', v),
    [set]
  )
  const setLocation = useCallback((v: string) => set('location', v), [set])
  const setStart = useCallback(
    (v: string) => {
      set('start', v)
      onStartChange?.(v)
    },
    [set, onStartChange]
  )
  const setEnd = useCallback(
    (v: string) => {
      set('end', v)
      onEndChange?.(v)
    },
    [set, onEndChange]
  )
  const setAllDay = useCallback((v: boolean) => set('allday', v), [set])
  const setTimezone = useCallback((v: string) => set('timezone', v), [set])
  const setRepetition = useCallback(
    (v: EventFormValues['repetition']) => set('repetition', v),
    [set]
  )
  const setAttendees = useCallback(
    (v: EventFormValues['attendees']) => set('attendees', v),
    [set]
  )
  const setAlarm = useCallback((v: string) => set('alarm', v), [set])
  const setBusy = useCallback((v: string) => set('busy', v), [set])
  const setEventClass = useCallback(
    (v: EventFormValues['eventClass']) => set('eventClass', v),
    [set]
  )
  const setCalendarid = useCallback((v: string) => set('calendarid', v), [set])
  const setHasVideoConference = useCallback(
    (v: boolean) => set('hasVideoConference', v),
    [set]
  )
  const setMeetingLink = useCallback(
    (v: string | null) => set('meetingLink', v),
    [set]
  )
  const setSelectedResources = useCallback(
    (v: EventFormValues['selectedResources']) => set('selectedResources', v),
    [set]
  )
  const setShowDescription = useCallback(
    (v: boolean) => set('showDescription', v),
    [set]
  )
  const setShowRepeat = useCallback((v: boolean) => set('showRepeat', v), [set])
  const setHasEndDateChanged = useCallback(
    (v: boolean) => set('hasEndDateChanged', v),
    [set]
  )

  const handleAllDayChange = useCallback(
    (newAllDay: boolean, newStart: string, newEnd: string) => {
      setFormValues(prev => ({
        ...prev,
        allday: newAllDay,
        start: newStart,
        end: newEnd
      }))
      onAllDayChange?.(newAllDay, newStart, newEnd)
    },
    [onAllDayChange, setFormValues]
  )

  return {
    setTitle,
    setDescription,
    setLocation,
    setStart,
    setEnd,
    setAllDay,
    setTimezone,
    setRepetition,
    setAttendees,
    setAlarm,
    setBusy,
    setEventClass,
    setCalendarid,
    setHasVideoConference,
    setMeetingLink,
    setSelectedResources,
    setShowDescription,
    setShowRepeat,
    setHasEndDateChanged,
    handleAllDayChange
  }
}

export function useEventFormValues({
  initialValues,
  isOpen,
  tempStorageKey,
  tempStorageContext,
  onStartChange,
  onEndChange,
  onAllDayChange
}: UseEventFormValuesParams): UseEventFormValuesReturn {
  const [formValues, setFormValues] = useState<EventFormValues>({
    ...DEFAULT_FORM_VALUES,
    ...initialValues
  })

  useEventFormSeeding(
    isOpen,
    tempStorageKey,
    tempStorageContext,
    initialValues,
    setFormValues
  )

  const set = useCallback(
    <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => {
      setFormValues(prev => ({ ...prev, [key]: value }))
    },
    []
  )

  const setters = useEventFormSetters(
    set,
    setFormValues,
    onStartChange,
    onEndChange,
    onAllDayChange
  )

  return {
    formValues,
    setFormValues,
    ...setters
  }
}
