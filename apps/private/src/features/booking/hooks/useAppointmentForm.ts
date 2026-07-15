import { useAppSelector } from '@common/app/hooks'
import type {
  AvailabilityRule,
  BookingLink,
  WeeklyAvailabilityRule
} from '@common/features/booking/types/BookingTypes'
import { calendarIdFromEventHref } from '@common/features/Calendars/CalendarDAO'
import { useUserPersonalCalendars } from '@common/features/Calendars/hooks/useUserPersonalCalendars'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DAY_TO_FC,
  DayAvailability,
  DAYS
} from '../components/RegularHoursField/RegularHoursTypes'

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
}

interface UseAppointmentFormReturn extends FormState {
  setName: (value: string) => void
  setDuration: (value: number) => void
  setDescription: (value: string) => void
  setShowDescription: (value: boolean) => void
  setTimezone: (value: string) => void
  setCalendarid: (value: string) => void
  setAvailabilityRules: React.Dispatch<React.SetStateAction<DayAvailability[]>>
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

const formStateFromBookingLink = (bookingLink: BookingLink): FormState => ({
  name: bookingLink.name ?? '',
  duration: bookingLink.durationMinutes,
  description: bookingLink.description ?? '',
  showDescription: Boolean(bookingLink.description),
  timezone: bookingTimezone(bookingLink),
  calendarid: calendarIdFromEventHref(bookingLink.calendarUrl),
  availabilityRules: DAYS.map((day): DayAvailability => {
    const rules = bookingLink.availabilityRules?.filter(
      (r: AvailabilityRule): r is WeeklyAvailabilityRule =>
        r.type === 'weekly' && r.dayOfWeek === day
    )
    return {
      dayOfWeek: day,
      enabled: !!rules?.length,
      slots:
        rules?.map((r: WeeklyAvailabilityRule) => ({
          start: r.start,
          end: r.end
        })) || []
    }
  })
})

const defaultFormState = (
  defaultCalendarId: string,
  workingDays?: number[]
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
      slots: [{ start: '09:00', end: '18:00' }]
    }
  })
})

interface FormSetters {
  setName: (value: string) => void
  setDuration: (value: number) => void
  setDescription: (value: string) => void
  setShowDescription: (value: boolean) => void
  setTimezone: (value: string) => void
  setCalendarid: (value: string) => void
  setAvailabilityRules: React.Dispatch<React.SetStateAction<DayAvailability[]>>
}

const makeSetters = (
  setForm: React.Dispatch<React.SetStateAction<FormState>>
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
    setForm(prev => ({ ...prev, calendarid: value })),
  setAvailabilityRules: (
    value: React.SetStateAction<DayAvailability[]>
  ): void =>
    setForm(prev => ({
      ...prev,
      availabilityRules:
        typeof value === 'function' ? value(prev.availabilityRules) : value
    }))
})

const computeInitialFormState = (
  isOpen: boolean,
  bookingLink: BookingLink | undefined,
  workingDays: number[] | undefined,
  firstCalendarId?: string
): FormState => {
  if (!isOpen) return defaultFormState('', workingDays)
  return bookingLink
    ? formStateFromBookingLink(bookingLink)
    : defaultFormState(firstCalendarId ?? '', workingDays)
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
      computeInitialFormState(
        isOpen,
        bookingLink,
        workingDays,
        userPersonalCalendars[0]?.id
      ),
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

  return {
    ...form,
    ...makeSetters(setForm),
    error,
    setError,
    loading,
    setLoading,
    isFormValid: checkFormValid(form),
    userPersonalCalendars
  }
}
