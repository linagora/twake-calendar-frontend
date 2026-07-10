import { useState, useEffect } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { useUserPersonalCalendars } from '@common/features/Calendars/hooks/useUserPersonalCalendars'
import type { BookingLink } from '@common/features/booking/types/BookingTypes'
import { calendarIdFromEventHref } from '@common/features/Calendars/CalendarDAO'

interface UseAppointmentFormOptions {
  bookingLink?: BookingLink
  isOpen: boolean
}

interface UseAppointmentFormReturn {
  name: string
  setName: (value: string) => void
  duration: number
  setDuration: (value: number) => void
  description: string
  setDescription: (value: string) => void
  showDescription: boolean
  setShowDescription: (value: boolean) => void
  timezone: string
  setTimezone: (value: string) => void
  calendarid: string
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

export const useAppointmentForm = ({
  bookingLink,
  isOpen
}: UseAppointmentFormOptions): UseAppointmentFormReturn => {
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const calList = useAppSelector(state => state.calendars.list)
  const userPersonalCalendars = useUserPersonalCalendars(calList, userId)

  const [name, setName] = useState('')
  const [duration, setDuration] = useState(30)
  const [loading, setLoading] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [description, setDescription] = useState('')
  const [timezone, setTimezone] = useState(localTimezone)
  const [calendarid, setCalendarid] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isFormValid =
    name.trim().length > 0 && calendarid !== '' && duration > 0

  // Edit mode: populate form from existing booking link
  useEffect(() => {
    if (!isOpen || !bookingLink) return
    setName(bookingLink.name || '')
    setDuration(bookingLink.durationMinutes)
    setDescription(bookingLink.description || '')
    setShowDescription(Boolean(bookingLink.description))
    setCalendarid(calendarIdFromEventHref(bookingLink.calendarUrl))
    setTimezone(bookingTimezone(bookingLink))
    setError(null)
  }, [isOpen, bookingLink])

  // Create mode: reset form to defaults
  useEffect(() => {
    if (!isOpen || bookingLink) return
    setName('')
    setDuration(30)
    setDescription('')
    setShowDescription(false)
    setTimezone(localTimezone())
    setCalendarid(userPersonalCalendars[0]?.id ?? '')
    setError(null)
  }, [isOpen, bookingLink, userPersonalCalendars])

  return {
    name,
    setName,
    duration,
    setDuration,
    description,
    setDescription,
    showDescription,
    setShowDescription,
    timezone,
    setTimezone,
    calendarid,
    setCalendarid,
    error,
    setError,
    loading,
    setLoading,
    isFormValid,
    userPersonalCalendars
  }
}
