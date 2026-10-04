import React from 'react'
import { Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { TimeSlotSelectField } from './TimeSlotSelectField'
import { TitleField } from './TitleField'
import { ColorField } from './ColorField'
import { AppointmentModalExpandedFields } from './AppointmentModalExpandedFields'
import type { Calendar } from '@common/types/CalendarTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { RegularHoursField } from './RegularHoursField'
import { DayAvailability } from './RegularHoursField/RegularHoursTypes'
import { useAppSelector } from '@common/app/hooks'
import { useFocusTitleOnOpen } from '@common/components/Event/hooks/useAutoFocusTitle'
import { userAttendee } from '@common/features/User/models/attendee'
import { Resource } from '@common/components/Attendees/ResourceSearch'
import { Valarms } from '@common/types/Valarms'
import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'

interface AppointmentModalFormProps {
  open: boolean
  isExpanded: boolean
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
  attendees: userAttendee[]
  setAttendees: (value: userAttendee[]) => void
  location: string
  setLocation: (value: string) => void
  alarms: Valarms
  setAlarms: (value: Valarms) => void
  busy: string
  setBusy: (value: string) => void
  eventClass: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'
  setEventClass: (value: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL') => void
  selectedResources: Resource[]
  setSelectedResources: (value: Resource[]) => void
  error: string | null
}

export const AppointmentModalForm: React.FC<
  AppointmentModalFormProps
> = props => {
  const {
    open,
    isExpanded,
    name,
    setName,
    duration,
    setDuration,
    color,
    setColor,
    availabilityRules,
    setAvailabilityRules,
    error,
    ...expandedFormFieldsProps
  } = props
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const nameInputRef = React.useRef<HTMLInputElement>(null)

  useFocusTitleOnOpen(open, null, nameInputRef)

  const inputSize = useResponsiveInputSize()

  const businessHours = useAppSelector(state => state.settings.businessHours)
  const workingDays = businessHours?.daysOfWeek

  const showExpandedLabel = isExpanded && !isMobile
  const titleLabel = isExpanded ? t('booking.title') : ''
  const participantsLabel = isExpanded ? t('event.form.participants') : ''

  return (
    <>
      {error && (
        <Typography role="alert" color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <TitleField
        titleLabel={titleLabel}
        showExpandedLabel={showExpandedLabel}
        name={name}
        setName={setName}
        nameInputRef={nameInputRef}
      />

      <TimeSlotSelectField
        duration={duration}
        setDuration={setDuration}
        isExpanded={isExpanded}
      />

      <RegularHoursField
        availabilityRules={availabilityRules}
        setAvailabilityRules={setAvailabilityRules}
        workingDays={workingDays}
        isExpanded={isExpanded}
      />

      <ColorField
        showExpandedLabel={showExpandedLabel}
        color={color}
        setColor={setColor}
      />

      <AppointmentModalExpandedFields
        isExpanded={isExpanded}
        showExpandedLabel={showExpandedLabel}
        participantsLabel={participantsLabel}
        inputSize={inputSize}
        open={open}
        {...expandedFormFieldsProps}
      />
    </>
  )
}
