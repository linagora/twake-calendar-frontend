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
    error,
    setError,
    loading,
    setLoading,
    isFormValid,
    userPersonalCalendars
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
            availabilityRules: (bookingLink.availabilityRules ?? []).map(
              rule => ({ ...rule, timeZone: timezone })
            ),
            description: description || null
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
      userPersonalCalendars={userPersonalCalendars}
      error={error}
      loading={loading}
      isFormValid={isFormValid}
      onSave={handleSave}
      saveButtonText={t('actions.save', { defaultValue: 'Save' })}
    />
  )
}
