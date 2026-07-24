import React from 'react'
import {
  Button,
  TextField,
  Box,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import { ResponsiveDialog } from '@common/components/Dialog'
import { useI18n } from 'twake-i18n'
import { AddDescButton } from '@common/components/Event/AddDescButton'
import { TimeSlotSelectField } from './TimeSlotSelectField'
import { TimezoneSelectField } from './TimezoneSelectField'
import { CalendarSelectField } from '@common/components/Event/fields/CalendarSelectField'
import { ColorPicker } from '@common/components/Calendar/CalendarColorPicker'
import type { Calendar } from '@common/types/CalendarTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { RegularHoursField } from './RegularHoursField'
import { DayAvailability } from './RegularHoursField/RegularHoursTypes'
import { useAppSelector } from '@common/app/hooks'
import { getAccessiblePair } from '@common/utils/getAccessiblePair'
import { useFocusTitleOnOpen } from '@common/components/Event/hooks/useAutoFocusTitle'

interface AppointmentModalFormProps {
  open: boolean
  onClose: () => void
  title: string
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
  color: string
  setColor: (value: string) => void
  userPersonalCalendars: Calendar[]
  availabilityRules?: DayAvailability[]
  setAvailabilityRules?: React.Dispatch<React.SetStateAction<DayAvailability[]>>
  error: string | null
  loading: boolean
  isFormValid: boolean
  onSave: () => void
  saveButtonText: string
}

export const AppointmentModalForm: React.FC<AppointmentModalFormProps> = ({
  open,
  onClose,
  title,
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
  userPersonalCalendars,
  availabilityRules,
  setAvailabilityRules,
  error,
  loading,
  isFormValid,
  onSave,
  saveButtonText
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const theme = useTheme()

  const nameInputRef = React.useRef<HTMLInputElement>(null)

  useFocusTitleOnOpen(open, null, nameInputRef)

  const businessHours = useAppSelector(state => state.settings.businessHours)
  const workingDays = businessHours?.daysOfWeek

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <Button
          onClick={() => void onSave()}
          variant="contained"
          disabled={loading || !isFormValid}
        >
          {saveButtonText}
        </Button>
      }
    >
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <TextField
        sx={{ pt: 1 }}
        size={isMobile ? 'medium' : 'small'}
        margin="dense"
        placeholder={t('booking.scheduleName')}
        type="text"
        fullWidth
        value={name}
        onChange={e => setName(e.target.value)}
        inputRef={nameInputRef}
      />

      <TimeSlotSelectField duration={duration} setDuration={setDuration} />

      <RegularHoursField
        availabilityRules={availabilityRules}
        setAvailabilityRules={setAvailabilityRules}
        workingDays={workingDays}
      />

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

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
          {t('booking.color', { defaultValue: 'Color' })}
        </Typography>
        <ColorPicker
          selectedColor={{
            light: color,
            dark: getAccessiblePair(color, theme)
          }}
          onChange={c => setColor(c.light)}
        />
      </Box>

      <CalendarSelectField
        calendarid={calendarid}
        setCalendarid={setCalendarid}
        userPersonalCalendars={userPersonalCalendars}
        showMore={false}
      />
    </ResponsiveDialog>
  )
}
