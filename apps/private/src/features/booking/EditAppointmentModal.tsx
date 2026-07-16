import React from 'react'
import { useI18n } from 'twake-i18n'
import { useAppDispatch } from '@common/app/hooks'
import { updateBookingLink } from '@common/features/booking/BookingLinksSlice'
import { useAppointmentForm } from './hooks/useAppointmentForm'
import { AppointmentModalForm } from './components/AppointmentModalForm'
import type { BookingLink } from '@common/features/booking/types/BookingTypes'

interface EditAppointmentModalProps {
  open: boolean
  onClose: () => void
  bookingLink: BookingLink
}

export const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({
  open,
  onClose,
  bookingLink
}) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const {
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
    color,
    setColor,
    error,
    setError,
    loading,
    setLoading,
    isFormValid,
    userPersonalCalendars,
    availabilityRules,
    setAvailabilityRules
  } = useAppointmentForm({ bookingLink, isOpen: open })

  const handleSave = async (): Promise<void> => {
    if (!isFormValid) {
      setError(t('booking.fillRequiredFields'))
      return
    }

    try {
      setLoading(true)
      setError(null)
      await dispatch(
        updateBookingLink({
          publicId: bookingLink.publicId,
          request: {
            name,
            durationMinutes: duration,
            calendarUrl: `/calendars/${calendarid}`,
            availabilityRules: availabilityRules
              .filter(rule => rule.enabled)
              .flatMap(rule =>
                rule.slots.map(slot => ({
                  type: 'weekly' as const,
                  dayOfWeek: rule.dayOfWeek,
                  start: slot.start,
                  end: slot.end,
                  timeZone: timezone
                }))
              ),
            description: description || null,
            color
          }
        })
      ).unwrap()
      onClose()
    } catch (err) {
      console.error('Failed to update booking link:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppointmentModalForm
      open={open}
      onClose={onClose}
      title={t('booking.editAppointmentTitle', {
        defaultValue: 'Edit appointment schedule'
      })}
      name={name}
      setName={setName}
      duration={duration}
      setDuration={setDuration}
      description={description}
      setDescription={setDescription}
      showDescription={showDescription}
      setShowDescription={setShowDescription}
      timezone={timezone}
      setTimezone={setTimezone}
      calendarid={calendarid}
      setCalendarid={setCalendarid}
      color={color}
      setColor={setColor}
      userPersonalCalendars={userPersonalCalendars}
      availabilityRules={availabilityRules}
      setAvailabilityRules={setAvailabilityRules}
      error={error}
      loading={loading}
      isFormValid={isFormValid}
      onSave={handleSave}
      saveButtonText={t('actions.save', { defaultValue: 'Save' })}
    />
  )
}
