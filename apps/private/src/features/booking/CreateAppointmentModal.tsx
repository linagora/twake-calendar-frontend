import React, { useState, useEffect } from 'react'
import {
  Button,
  TextField,
  Box,
  Divider,
  Typography
} from '@linagora/twake-mui'
import { ResponsiveDialog } from '@common/components/Dialog'
import { useI18n } from 'twake-i18n'
import { createBookingLink } from '@common/features/booking/BookingDao'
import { useAppSelector } from '@common/app/hooks'
import { useUserPersonalCalendars } from '@common/features/Calendars/hooks/useUserPersonalCalendars'
import { AddDescButton } from '@common/components/Event/AddDescButton'
import { TimeSlotSelectField } from './components/TimeSlotSelectField'
import { TimezoneSelectField } from './components/TimezoneSelectField'
import { CalendarSelectField } from '@common/components/Event/fields/CalendarSelectField'

interface CreateAppointmentModalProps {
  open: boolean
  onClose: () => void
}

export const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  open,
  onClose
}) => {
  const { t } = useI18n()
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
      await createBookingLink({
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
      title={t('booking.createAppointmentTitle', {
        defaultValue: 'Create appointment schedule'
      })}
      actions={
        <Button
          onClick={() => void handleSave()}
          variant="contained"
          disabled={loading || !isFormValid}
        >
          {t('booking.save', { defaultValue: 'Save' })}
        </Button>
      }
    >
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <TextField
        autoFocus
        margin="dense"
        id="name"
        placeholder={t('booking.scheduleName')}
        type="text"
        fullWidth
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <TimeSlotSelectField duration={duration} setDuration={setDuration} />

      <Box sx={{ mb: 2, mt: 3 }}>
        <Divider />
      </Box>

      <AddDescButton
        showDescription={showDescription}
        setShowDescription={setShowDescription}
        showMore={false}
        description={description}
        setDescription={setDescription}
        attachments={[]}
        setAttachments={() => {}}
      />

      <TimezoneSelectField timezone={timezone} setTimezone={setTimezone} />

      <CalendarSelectField
        calendarid={calendarid}
        setCalendarid={setCalendarid}
        userPersonalCalendars={userPersonalCalendars}
        showMore={false}
      />
    </ResponsiveDialog>
  )
}
