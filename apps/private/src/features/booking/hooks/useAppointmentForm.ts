import { useState, useEffect } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { useUserPersonalCalendars } from '@common/features/Calendars/hooks/useUserPersonalCalendars'
import type { BookingLink } from '@common/features/booking/types/BookingTypes'

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
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [calendarid, setCalendarid] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isFormValid =
    name.trim().length > 0 && calendarid !== '' && duration > 0

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (bookingLink) {
        // Edit mode: populate with existing data
        setName(bookingLink.name || '')
        setDuration(bookingLink.durationMinutes)
        setDescription(bookingLink.description || '')
        setShowDescription(Boolean(bookingLink.description))
        // Extract calendar ID from calendarUrl (e.g., "/calendars/abc123" -> "abc123")
        const extractedCalendarId =
          bookingLink.calendarUrl.split('/').pop() || ''
        setCalendarid(extractedCalendarId)
        // Try to extract timezone from availability rules
        const weeklyRule = bookingLink.availabilityRules?.find(
          rule => rule.type === 'weekly'
        )
        setTimezone(
          weeklyRule?.timeZone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone
        )
      } else {
        // Create mode: reset form
        setName('')
        setDuration(30)
        setDescription('')
        setShowDescription(false)
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
        setCalendarid(
          userPersonalCalendars.length > 0 ? userPersonalCalendars[0].id : ''
        )
      }
      setError(null)
    }
  }, [isOpen, bookingLink, userPersonalCalendars])

  // Set default calendar for create mode
  useEffect(() => {
    if (!bookingLink && !calendarid && userPersonalCalendars.length > 0) {
      setCalendarid(userPersonalCalendars[0].id)
    }
  }, [bookingLink, userPersonalCalendars, calendarid])

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
