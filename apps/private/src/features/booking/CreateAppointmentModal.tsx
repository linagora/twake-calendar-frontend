import { createBookingLink } from '@common/features/booking/BookingDao'
import { setVisibleBookingLinks } from '@common/utils/storage/setVisibleBookingLinks'
import React, { useEffect } from 'react'
import { useI18n } from 'twake-i18n'
import { AppointmentModalForm } from './components/AppointmentModalForm'
import { useAppointmentForm } from './hooks/useAppointmentForm'
import { getVisibleBookingLinks } from '@common/utils/storage/getVisibleBookingLinks'

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
  } = useAppointmentForm({ isOpen: open })

  useEffect(() => {
    if (!calendarid && userPersonalCalendars.length > 0) {
      setCalendarid(userPersonalCalendars[0].id)
    }
  }, [userPersonalCalendars, calendarid, setCalendarid])

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
        description,
        color
      })
      const currentLinks = getVisibleBookingLinks()
      if (!currentLinks.includes(response.bookingLinkPublicId)) {
        setVisibleBookingLinks([...currentLinks, response.bookingLinkPublicId])
      }
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
      title={t('booking.createAppointmentTitle')}
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
      onSave={() => void handleSave()}
      saveButtonText={t('booking.save')}
    />
  )
}
