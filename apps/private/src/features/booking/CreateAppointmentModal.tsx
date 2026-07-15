import { createBookingLink } from '@common/features/booking/BookingDao'
import { setVisibleBookingLinks } from '@common/utils/storage/setVisibleBookingLinks'
import { useVisibleBookingLinks } from '@common/utils/storage/useVisibleBookingLinks'
import React, { useEffect } from 'react'
import { useI18n } from 'twake-i18n'
import { AppointmentModalForm } from './components/AppointmentModalForm'
import { useAppointmentForm } from './hooks/useAppointmentForm'

interface CreateAppointmentModalProps {
  open: boolean
  onClose: () => void
}

export const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  open,
  onClose
}) => {
  const { t } = useI18n()
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
  } = useAppointmentForm({ isOpen: open })

  const visibleBookingLinks = useVisibleBookingLinks()

  useEffect(() => {
    if (!calendarid && userPersonalCalendars.length > 0) {
      setCalendarid(userPersonalCalendars[0].id)
    }
  }, [userPersonalCalendars, calendarid])

  const handleSave = async (): Promise<void> => {
    if (!isFormValid) {
      setError(t('booking.fillRequiredFields'))
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await createBookingLink({
        name,
        durationMinutes: duration,
        calendarUrl: `/calendars/${calendarid}`,
        active: true,
        autoAccept: false,
        availabilityRules: (['MON', 'TUE', 'WED', 'THU', 'FRI'] as const).map(
          day => ({
            type: 'weekly',
            dayOfWeek: day,
            start: '09:00',
            end: '18:00',
            timeZone: timezone
          })
        ),
        description
      })
      setVisibleBookingLinks([
        ...visibleBookingLinks,
        response.bookingLinkPublicId
      ])
      onClose()
    } catch (err) {
      console.error('Failed to create booking link:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppointmentModalForm
      open={open}
      onClose={onClose}
      title={t('booking.createAppointmentTitle', {
        defaultValue: 'Create appointment schedule'
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
      saveButtonText={t('booking.save', { defaultValue: 'Save' })}
    />
  )
}
