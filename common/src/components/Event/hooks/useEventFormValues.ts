import {
  DEFAULT_FORM_VALUES,
  EventFormValues,
  UseEventFormValuesParams,
  UseEventFormValuesReturn
} from '@common/components/Event/EventFormFields.types'
import { Attachment } from '@common/types/Attachment'
import { Valarms } from '@common/types/Valarms'
import {
  EventFormContext,
  EventFormTempData,
  restoreEventFormDataFromTemp,
  saveEventFormDataToTemp
} from '@common/utils/eventFormTempStorage'
import { isEventFormDirty } from '@common/utils/isEventFormDirty'
import { followStartWeekday } from '@common/components/Event/utils/followStartWeekday'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { CalendarEvent } from '@common/types/EventsTypes'

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
    alarms: Valarms.fromJSON(tempData.alarms),
    busy: tempData.busy,
    eventClass: tempData.eventClass,
    timezone: tempData.timezone,
    calendarid: tempData.calendarid,
    hasVideoConference: tempData.hasVideoConference,
    meetingLink: tempData.meetingLink,
    selectedResources: tempData.resources ?? [],
    attachments: tempData.attachments ?? [],
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
  setAttachments: (v: Attachment[]) => void
  setOrganizer: (v: userOrganiser | undefined) => void
  setLocation: (v: string) => void
  setStart: (v: string) => void
  setEnd: (v: string) => void
  setAllDay: (v: boolean) => void
  setTimezone: (v: string) => void
  setRepetition: (v: EventFormValues['repetition']) => void
  setAttendees: (v: EventFormValues['attendees']) => void
  setAlarms: (v: Valarms) => void
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
      setFormValues(prev => ({
        ...prev,
        start: v,
        repetition: followStartWeekday(prev.repetition, prev.start, v)
      }))
      onStartChange?.(v)
    },
    [setFormValues, onStartChange]
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
  const setAlarms = useCallback(
    (v: Valarms) => {
      set('alarms', v)
    },
    [set]
  )
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
  const setAttachments = useCallback(
    (v: EventFormValues['attachments']) => set('attachments', v),
    [set]
  )
  const setOrganizer = useCallback(
    (v: userOrganiser | undefined) => set('organizer', v),
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
    setAlarms,
    setBusy,
    setEventClass,
    setCalendarid,
    setHasVideoConference,
    setMeetingLink,
    setSelectedResources,
    setShowDescription,
    setShowRepeat,
    setHasEndDateChanged,
    setAttachments,
    setOrganizer,
    handleAllDayChange
  }
}

function useInitialOrganizer(
  userOrganizer: userOrganiser | undefined,
  eventOrganizer: CalendarEvent['organizer'] | undefined
): userOrganiser | undefined {
  return useMemo(() => {
    if (eventOrganizer) {
      return new userOrganiser({
        cal_address: eventOrganizer.cal_address,
        cn: eventOrganizer.cn,
        sentBy: eventOrganizer.sentBy,
        otherParams: eventOrganizer.otherParams,
        paramOrder: eventOrganizer.paramOrder
      })
    }
    return userOrganizer
  }, [eventOrganizer, userOrganizer])
}

function useEventFormOrganizerSideEffects(
  calendarid: string,
  userOrganizer: userOrganiser | undefined,
  eventOrganizer: CalendarEvent['organizer'] | undefined,
  setFormValues: React.Dispatch<React.SetStateAction<EventFormValues>>
): void {
  const [prevCalendarId, setPrevCalendarId] = useState(calendarid)
  const [prevUserOrganizer, setPrevUserOrganizer] = useState(userOrganizer)

  useEffect(() => {
    const initOrganizer = (): void => {
      if (prevCalendarId !== calendarid) {
        setPrevCalendarId(calendarid)
        setFormValues(prev => ({ ...prev, organizer: undefined }))
      } else if (prevUserOrganizer !== userOrganizer && !eventOrganizer) {
        setPrevUserOrganizer(userOrganizer)
        setFormValues(prev => ({ ...prev, organizer: undefined }))
      }
    }
    initOrganizer()
  }, [
    calendarid,
    prevCalendarId,
    prevUserOrganizer,
    eventOrganizer,
    userOrganizer,
    setFormValues
  ])
}

export function useEventFormValues({
  initialValues,
  isOpen,
  tempStorageKey,
  tempStorageContext,
  onStartChange,
  onEndChange,
  onAllDayChange,
  userOrganizer,
  eventOrganizer
}: UseEventFormValuesParams): UseEventFormValuesReturn {
  const initialOrganizer = useInitialOrganizer(userOrganizer, eventOrganizer)

  const initialValuesWithOrganizer = useMemo(
    () => ({ ...initialValues, organizer: initialOrganizer }),
    [initialValues, initialOrganizer]
  )

  const [formValues, setFormValues] = useState<EventFormValues>({
    ...DEFAULT_FORM_VALUES,
    ...initialValuesWithOrganizer
  })

  useEventFormSeeding(
    isOpen,
    tempStorageKey,
    tempStorageContext,
    initialValuesWithOrganizer,
    setFormValues
  )

  useEventFormOrganizerSideEffects(
    formValues.calendarid,
    userOrganizer,
    eventOrganizer,
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

  const isDirty = useMemo(
    () => isEventFormDirty(formValues, initialValuesWithOrganizer),
    [formValues, initialValuesWithOrganizer]
  )

  return {
    formValues,
    isDirty,
    setFormValues,
    ...setters
  }
}
