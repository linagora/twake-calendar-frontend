import React, { useEffect, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { useAppDispatch } from '@common/app/hooks'
import { updateBookingLink } from '@common/features/booking/BookingLinksSlice'
import { SnackbarAlert } from '@common/components/Loading/SnackBarAlert'
import { ResponsiveDialog } from '@common/components/Dialog'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import {
  invalidAppointmentMessage,
  useAppointmentForm
} from './hooks/useAppointmentForm'
import { AppointmentModalForm } from './components/AppointmentModalForm'
import { HeaderRightAction } from './components/HeaderRightAction'
import { ModalActions } from './components/ModalActions'
import type { BookingLink } from '@common/features/booking/types/BookingTypes'
import {
  formatResourceIds,
  formatAlarms,
  formatExtraAttendees,
  buildUpdateBookingPayload
} from './utils'
import { useHighContrast } from '@common/features/Settings/Accessibility/highContrastMode'

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
  const highContrast = useHighContrast()
  const dispatch = useAppDispatch()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const buttonSize = isMobile ? 'small' : 'medium'
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDisableEnableSuccess, setShowDisableEnableSuccess] =
    useState(false)
  const [activeSuccessMessage, setActiveSuccessMessage] = useState('')
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
  } = useAppointmentForm({ bookingLink, isOpen: open })

  useEffect(() => {
    if (!open) {
      setIsExpanded(false)
    }
  }, [open])

  const handleActiveToggle = async (newActive: boolean): Promise<void> => {
    const prevActive = active
    setActive(newActive)
    setLoading(true)
    setError(null)
    try {
      await dispatch(
        updateBookingLink({
          publicId: bookingLink.publicId,
          request: {
            active: newActive
          }
        })
      ).unwrap()
      setActiveSuccessMessage(
        newActive ? t('booking.enabledSuccess') : t('booking.disabledSuccess')
      )
      setShowDisableEnableSuccess(true)
    } catch (err) {
      console.error('Failed to update booking link active status:', err)
      setError(err instanceof Error ? err.message : String(err))
      setActive(prevActive)
    } finally {
      setLoading(false)
    }
  }

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

      const payload = buildUpdateBookingPayload({
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

      await dispatch(
        updateBookingLink({
          publicId: bookingLink.publicId,
          request: payload
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
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={t('booking.editAppointmentTitle', {
        defaultValue: 'Edit appointment schedule'
      })}
      headerRightAction={
        <HeaderRightAction
          onActiveChange={newActive => void handleActiveToggle(newActive)}
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
          saveButtonText={t('actions.save', { defaultValue: 'Save' })}
          isEdit
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

      <SnackbarAlert
        key={activeSuccessMessage}
        open={showDisableEnableSuccess}
        setOpen={setShowDisableEnableSuccess}
        message={activeSuccessMessage}
      />
    </ResponsiveDialog>
  )
}
