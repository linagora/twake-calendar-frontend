import { useAppSelector } from '@common/app/hooks'
import type { BookingLink } from '@common/features/booking/types/BookingTypes'
import { calendarIdFromEventHref } from '@common/features/Calendars/CalendarDAO'
import { useUserPersonalCalendars } from '@common/features/Calendars/hooks/useUserPersonalCalendars'
import { useEffect, useState } from 'react'

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

const DEFAULT_FORM_STATE: FormState = {
  name: '',
  duration: 30,
  description: '',
  showDescription: false,
  timezone: localTimezone(),
  calendarid: ''
}

const formStateFromBookingLink = (bookingLink: BookingLink): FormState => ({
  name: bookingLink.name ?? '',
  duration: bookingLink.durationMinutes,
  description: bookingLink.description ?? '',
  showDescription: Boolean(bookingLink.description),
  timezone: bookingTimezone(bookingLink),
  calendarid: calendarIdFromEventHref(bookingLink.calendarUrl)
})

export const useAppointmentForm = ({
  bookingLink,
  isOpen
}: UseAppointmentFormOptions): UseAppointmentFormReturn => {
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const calList = useAppSelector(state => state.calendars.list)
  const userPersonalCalendars = useUserPersonalCalendars(calList, userId)

  const [form, setForm] = useState<FormState>(DEFAULT_FORM_STATE)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const setField =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm(prev => ({ ...prev, [key]: value }))

  const isFormValid =
    form.name.trim().length > 0 && form.calendarid !== '' && form.duration > 0

  // Edit mode: populate form from existing booking link
  useEffect(() => {
    if (!isOpen || !bookingLink) return
    setForm(formStateFromBookingLink(bookingLink))
    setError(null)
  }, [isOpen, bookingLink])

  // Create mode: reset form to defaults
  useEffect(() => {
    if (!isOpen || bookingLink) return
    setForm({
      ...DEFAULT_FORM_STATE,
      calendarid: userPersonalCalendars[0]?.id ?? ''
    })
    setError(null)
  }, [isOpen, bookingLink, userPersonalCalendars])

  return {
    ...form,
    setName: setField('name'),
    setDuration: setField('duration'),
    setDescription: setField('description'),
    setShowDescription: setField('showDescription'),
    setTimezone: setField('timezone'),
    setCalendarid: setField('calendarid'),
    error,
    setError,
    loading,
    setLoading,
    isFormValid,
    userPersonalCalendars
  }
}
