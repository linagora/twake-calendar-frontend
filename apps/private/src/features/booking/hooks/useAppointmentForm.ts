import { useAppSelector } from '@common/app/hooks'
import type {
  AvailabilityRule,
  BookingLink,
  WeeklyAvailabilityRule
} from '@common/features/booking/types/BookingTypes'
import type { Calendar } from '@common/types/CalendarTypes'
import { calendarIdFromEventHref } from '@common/features/Calendars/CalendarDAO'
import { useUserPersonalCalendars } from '@common/features/Calendars/hooks/useUserPersonalCalendars'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DAY_TO_FC,
  DayAvailability,
  DAYS
} from '../components/RegularHoursField/RegularHoursTypes'
import { defaultColors } from '@common/utils/defaultColors'
import { DEFAULT_SLOT } from './useRegularHours'
import { userAttendee } from '@common/features/User/models/attendee'
import type { Resource } from '@common/components/Attendees/ResourceSearch'
import { Valarms } from '@common/types/Valarms'
import { VAlarm } from '@common/types/VAlarm'
import { useResolveBookingLinkEntities } from './useResolveBookingLinkEntities'

interface UseAppointmentFormOptions {
  bookingLink?: BookingLink
  isOpen: boolean
}

interface FormState {
  name: string
  duration: number
  description: string
  showDescription: boolean
  timezone: string
  calendarid: string
  availabilityRules: DayAvailability[]
  color: string
  active: boolean
  attendees: userAttendee[]
  location: string
  alarms: Valarms
  busy: string
  eventClass: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'
  selectedResources: Resource[]
}

interface UseAppointmentFormReturn extends FormState {
  setName: (value: string) => void
  setDuration: (value: number) => void
  setDescription: (value: string) => void
  setShowDescription: (value: boolean) => void
  setTimezone: (value: string) => void
  setCalendarid: (value: string) => void
  setAvailabilityRules: React.Dispatch<React.SetStateAction<DayAvailability[]>>
  setColor: (value: string) => void
  setActive: (value: boolean) => void
  setAttendees: (value: userAttendee[]) => void
  setLocation: (value: string) => void
  setAlarms: (value: Valarms) => void
  setBusy: (value: string) => void
  setEventClass: (value: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL') => void
  setSelectedResources: (value: Resource[]) => void
  error: string | null
  setError: (value: string | null) => void
  loading: boolean
  setLoading: (value: boolean) => void
  isFormValid: boolean
  userPersonalCalendars: ReturnType<typeof useUserPersonalCalendars>
}

const localTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone

const bookingTimezone = (bookingLink: BookingLink): string =>
  bookingLink.availabilityRules?.find(
    (rule: AvailabilityRule) => rule.type === 'weekly'
  )?.timeZone ?? localTimezone()

const extractAvailabilityRules = (
  bookingLink: BookingLink
): DayAvailability[] =>
  DAYS.map((day): DayAvailability => {
    const rules = bookingLink.availabilityRules?.filter(
      (r: AvailabilityRule): r is WeeklyAvailabilityRule =>
        r.type === 'weekly' && r.dayOfWeek === day
    )
    return {
      dayOfWeek: day,
      enabled: !!rules?.length,
      slots: rules?.map((r: WeeklyAvailabilityRule) => ({
        start: r.start,
        end: r.end
      })) || [DEFAULT_SLOT]
    }
  })

const extractAttendees = (bookingLink: BookingLink): userAttendee[] =>
  bookingLink.extraAttendees?.and?.map(
    p =>
      new userAttendee({
        cal_address: p.participant,
        openpaasId: p.participant,
        cn: p.participant
      })
  ) ?? []

const extractAlarms = (bookingLink: BookingLink): Valarms =>
  bookingLink.alarm?.length
    ? Valarms.fromList(
        bookingLink.alarm.map(
          a =>
            new VAlarm({
              trigger: a.period,
              action: a.action || 'EMAIL'
            })
        )
      )
    : new Valarms()

const extractResources = (bookingLink: BookingLink): Resource[] =>
  bookingLink.resources?.map(id => ({
    displayName: id,
    openpaasId: id
  })) ?? []

const formStateFromBookingLink = (
  bookingLink: BookingLink,
  calendarColor?: string
): FormState => ({
  name: bookingLink.name ?? '',
  duration: bookingLink.durationMinutes,
  description: bookingLink.description ?? '',
  showDescription: Boolean(bookingLink.description),
  timezone: bookingTimezone(bookingLink),
  calendarid: calendarIdFromEventHref(bookingLink.calendarUrl),
  availabilityRules: extractAvailabilityRules(bookingLink),
  color: bookingLink.color ?? calendarColor ?? defaultColors[4].dark,
  active: bookingLink.active ?? true,
  attendees: extractAttendees(bookingLink),
  location: bookingLink.location ?? '',
  alarms: extractAlarms(bookingLink),
  busy: bookingLink.transparency ?? 'OPAQUE',
  eventClass:
    (bookingLink.visibility as 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL') ??
    'PUBLIC',
  selectedResources: extractResources(bookingLink)
})

const defaultFormState = (
  defaultCalendarId: string,
  workingDays?: number[],
  defaultCalendarColor?: string
): FormState => ({
  name: '',
  duration: 30,
  description: '',
  showDescription: false,
  timezone: localTimezone(),
  calendarid: defaultCalendarId,
  availabilityRules: DAYS.map(day => {
    const isWorkingDay = workingDays
      ? workingDays.includes(DAY_TO_FC[day])
      : true
    return {
      dayOfWeek: day,
      enabled: isWorkingDay,
      slots: [DEFAULT_SLOT]
    }
  }),
  color: defaultCalendarColor ?? defaultColors[4].dark,
  active: true,
  attendees: [],
  location: '',
  alarms: new Valarms(),
  busy: 'OPAQUE',
  eventClass: 'PUBLIC',
  selectedResources: []
})

interface FormSetters {
  setName: (value: string) => void
  setDuration: (value: number) => void
  setDescription: (value: string) => void
  setShowDescription: (value: boolean) => void
  setTimezone: (value: string) => void
  setCalendarid: (value: string) => void
  setAvailabilityRules: React.Dispatch<React.SetStateAction<DayAvailability[]>>
  setColor: (value: string) => void
  setActive: (value: boolean) => void
  setAttendees: (value: userAttendee[]) => void
  setLocation: (value: string) => void
  setAlarms: (value: Valarms) => void
  setBusy: (value: string) => void
  setEventClass: (value: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL') => void
  setSelectedResources: (value: Resource[]) => void
}

const makeSetters = (
  setForm: React.Dispatch<React.SetStateAction<FormState>>,
  calendars: Calendar[]
): FormSetters => ({
  setName: (value: string): void => setForm(prev => ({ ...prev, name: value })),
  setDuration: (value: number): void =>
    setForm(prev => ({ ...prev, duration: value })),
  setDescription: (value: string): void =>
    setForm(prev => ({ ...prev, description: value })),
  setShowDescription: (value: boolean): void =>
    setForm(prev => ({ ...prev, showDescription: value })),
  setTimezone: (value: string): void =>
    setForm(prev => ({ ...prev, timezone: value })),
  setCalendarid: (value: string): void =>
    setForm(prev => {
      const calendar = calendars.find(c => c.id === value)
      return {
        ...prev,
        calendarid: value,
        color: calendar?.color?.light ?? prev.color
      }
    }),
  setAvailabilityRules: (
    value: React.SetStateAction<DayAvailability[]>
  ): void =>
    setForm(prev => ({
      ...prev,
      availabilityRules:
        typeof value === 'function' ? value(prev.availabilityRules) : value
    })),
  setColor: (value: string): void =>
    setForm(prev => ({ ...prev, color: value })),
  setActive: (value: boolean): void =>
    setForm(prev => ({ ...prev, active: value })),
  setAttendees: (value: userAttendee[]): void =>
    setForm(prev => ({ ...prev, attendees: value })),
  setLocation: (value: string): void =>
    setForm(prev => ({ ...prev, location: value })),
  setAlarms: (value: Valarms): void =>
    setForm(prev => ({ ...prev, alarms: value })),
  setBusy: (value: string): void => setForm(prev => ({ ...prev, busy: value })),
  setEventClass: (value: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'): void =>
    setForm(prev => ({ ...prev, eventClass: value })),
  setSelectedResources: (value: Resource[]): void =>
    setForm(prev => ({ ...prev, selectedResources: value }))
})

interface ComputeInitialFormStateOptions {
  isOpen: boolean
  bookingLink: BookingLink | undefined
  workingDays: number[] | undefined
  userPersonalCalendars: Calendar[]
}

const computeInitialFormState = ({
  isOpen,
  bookingLink,
  workingDays,
  userPersonalCalendars
}: ComputeInitialFormStateOptions): FormState => {
  const firstCalendarId = userPersonalCalendars[0]?.id
  const firstCalendarColor = userPersonalCalendars[0]?.color?.light

  if (!isOpen) return defaultFormState('', workingDays, firstCalendarColor)
  return bookingLink
    ? formStateFromBookingLink(bookingLink, firstCalendarColor)
    : defaultFormState(firstCalendarId ?? '', workingDays, firstCalendarColor)
}

const checkFormValid = (form: FormState): boolean =>
  form.calendarid !== '' && form.duration > 0

export const useAppointmentForm = ({
  bookingLink,
  isOpen
}: UseAppointmentFormOptions): UseAppointmentFormReturn => {
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const calList = useAppSelector(state => state.calendars.list)
  const businessHours = useAppSelector(state => state.settings?.businessHours)
  const userPersonalCalendars = useUserPersonalCalendars(calList, userId)

  const workingDays = businessHours?.daysOfWeek

  const initialForm = useMemo(
    () =>
      computeInitialFormState({
        isOpen,
        bookingLink,
        workingDays,
        userPersonalCalendars
      }),
    [isOpen, bookingLink, userPersonalCalendars, workingDays]
  )

  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const prevIsOpen = useRef(isOpen)
  useEffect(() => {
    const initForm = (): void => {
      setForm(initialForm)
      setError(null)
    }
    if (isOpen && !prevIsOpen.current) {
      initForm()
    }
    prevIsOpen.current = isOpen
  }, [isOpen, initialForm])

  const handleSetAttendees = useCallback(
    (attendees: userAttendee[]) => setForm(prev => ({ ...prev, attendees })),
    []
  )

  const handleSetSelectedResources = useCallback(
    (selectedResources: Resource[]) =>
      setForm(prev => ({ ...prev, selectedResources })),
    []
  )

  useResolveBookingLinkEntities({
    isOpen,
    bookingLink,
    setAttendees: handleSetAttendees,
    setSelectedResources: handleSetSelectedResources
  })

  return {
    ...form,
    ...makeSetters(setForm, userPersonalCalendars),
    error,
    setError,
    loading,
    setLoading,
    isFormValid: checkFormValid(form),
    userPersonalCalendars
  }
}
