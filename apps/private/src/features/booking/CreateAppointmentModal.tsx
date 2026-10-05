import { createBookingLink } from '@common/features/booking/BookingDao'
import { setVisibleBookingLinks } from '@common/utils/storage/setVisibleBookingLinks'
import React, { useEffect, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { ResponsiveDialog } from '@common/components/Dialog'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { AppointmentModalForm } from './components/AppointmentModalForm'
import { HeaderRightAction } from './components/HeaderRightAction'
import { ModalActions } from './components/ModalActions'
import {
  invalidAppointmentMessage,
  useAppointmentForm
} from './hooks/useAppointmentForm'
import { getVisibleBookingLinks } from '@common/utils/storage/getVisibleBookingLinks'
import {
  formatResourceIds,
  formatAlarms,
  formatExtraAttendees,
  buildBookingPayload
} from './utils'
import { useHighContrast } from '@common/features/Settings/Accessibility/highContrastMode'

interface CreateAppointmentModalProps {
  open: boolean
  onClose: () => void
}

export const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  open,
  onClose
}) => {
  const { t } = useI18n()
  const highContrast = useHighContrast()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const buttonSize = isMobile ? 'small' : 'medium'
  const [isExpanded, setIsExpanded] = useState(false)
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
    active,
    setActive,
    error,
    setError,
    loading,
    setLoading,
    isFormValid,
    userPersonalCalendars,
    availabilityRules,
    setAvailabilityRules,
    attendees,
    setAttendees,
    location,
    setLocation,
    alarms,
    setAlarms,
    busy,
    setBusy,
    eventClass,
    setEventClass,
    selectedResources,
    setSelectedResources
  } = useAppointmentForm({ isOpen: open })

  useEffect(() => {
    if (!calendarid && userPersonalCalendars.length > 0) {
      setCalendarid(userPersonalCalendars[0].id)
    }
  }, [userPersonalCalendars, calendarid, setCalendarid])

  useEffect(() => {
    if (!open) {
      setIsExpanded(false)
    }
  }, [open])

  const handleSave = async (): Promise<void> => {
    if (!isFormValid) {
      setError(
        highContrast
          ? invalidAppointmentMessage(
              { calendarid, duration, availabilityRules },
              t
            )
          : t('booking.fillRequiredFields')
      )
      return
    }

    try {
      setLoading(true)
      setError(null)
      const resourceIds = formatResourceIds(selectedResources)
      const alarmList = formatAlarms(alarms)
      const extraAttendeesList = formatExtraAttendees(attendees)

      const payload = buildBookingPayload({
        name,
        duration,
        calendarid,
        active,
        availabilityRules,
        timezone,
        description,
        color,
        location,
        eventClass,
        busy,
        resourceIds,
        alarmList,
        extraAttendeesList
      })

      const response = await createBookingLink(payload)
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
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={t('booking.createAppointmentTitle')}
      headerRightAction={
        <HeaderRightAction
          onActiveChange={setActive}
          active={active}
          loading={loading}
        />
      }
      isExpanded={isExpanded}
      onExpandToggle={() => setIsExpanded(p => !p)}
      expandText={t('tooltip.expand')}
      actions={
        <ModalActions
          isExpanded={isExpanded}
          buttonSize={buttonSize}
          onExpandToggle={() => setIsExpanded(s => !s)}
          onSave={() => void handleSave()}
          onClose={onClose}
          loading={loading}
          isFormValid={isFormValid}
          saveButtonText={t('booking.save')}
        />
      }
    >
      <AppointmentModalForm
        open={open}
        isExpanded={isExpanded}
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
        attendees={attendees}
        setAttendees={setAttendees}
        location={location}
        setLocation={setLocation}
        alarms={alarms}
        setAlarms={setAlarms}
        busy={busy}
        setBusy={setBusy}
        eventClass={eventClass}
        setEventClass={setEventClass}
        selectedResources={selectedResources}
        setSelectedResources={setSelectedResources}
        error={error}
      />
    </ResponsiveDialog>
  )
}
