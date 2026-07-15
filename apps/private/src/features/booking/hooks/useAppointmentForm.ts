import { useState, useMemo } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { useUserPersonalCalendars } from '@common/features/Calendars/hooks/useUserPersonalCalendars'
import type { BookingLink } from '@common/features/booking/types/BookingTypes'
import { calendarIdFromEventHref } from '@common/features/Calendars/CalendarDAO'

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
}

interface UseAppointmentFormReturn extends FormState {
  setName: (value: string) => void
  setDuration: (value: number) => void
  setDescription: (value: string) => void
  setShowDescription: (value: boolean) => void
  setTimezone: (value: string) => void
  setCalendarid: (value: string) => void
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
  bookingLink.availabilityRules?.find(rule => rule.type === 'weekly')
    ?.timeZone ?? localTimezone()

const formStateFromBookingLink = (bookingLink: BookingLink): FormState => ({
  name: bookingLink.name ?? '',
  duration: bookingLink.durationMinutes,
  description: bookingLink.description ?? '',
  showDescription: Boolean(bookingLink.description),
  timezone: bookingTimezone(bookingLink),
  calendarid: calendarIdFromEventHref(bookingLink.calendarUrl)
})

const defaultFormState = (defaultCalendarId: string): FormState => ({
  name: '',
  duration: 30,
  description: '',
  showDescription: false,
  timezone: localTimezone(),
  calendarid: defaultCalendarId
})

const makeSetters = (
  setForm: React.Dispatch<React.SetStateAction<FormState>>
) => ({
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
    setForm(prev => ({ ...prev, calendarid: value }))
})

export const useAppointmentForm = ({
  bookingLink,
  isOpen
}: UseAppointmentFormOptions): UseAppointmentFormReturn => {
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const calList = useAppSelector(state => state.calendars.list)
  const userPersonalCalendars = useUserPersonalCalendars(calList, userId)

  const initialForm = useMemo((): FormState => {
    if (!isOpen) return defaultFormState('')
    return bookingLink
      ? formStateFromBookingLink(bookingLink)
      : defaultFormState(userPersonalCalendars[0]?.id ?? '')
  }, [isOpen, bookingLink, userPersonalCalendars])

  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isFormValid =
    form.name.trim().length > 0 && form.calendarid !== '' && form.duration > 0

  return {
    ...form,
    ...makeSetters(setForm),
    error,
    setError,
    loading,
    setLoading,
    isFormValid,
    userPersonalCalendars
  }
}
