import { useAppSelector } from '@common/app/hooks'
import AttendeeSelector from '@common/components/Attendees/AttendeeSearch'
import { useEventOrganizer } from '@common/features/Events/useEventOrganizer'
import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import {
  EventFormContext,
  saveEventFormDataToTemp
} from '@common/utils/eventFormTempStorage'
import {
  browserDefaultTimeZone,
  getTimezoneOffset,
  resolveTimezone
} from '@common/utils/timezone'
import { TIMEZONES } from '@common/utils/timezone-data'
import { TextField } from '@linagora/twake-mui'
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react'
import { useI18n } from 'twake-i18n'
import { AddDescButton } from './AddDescButton'
import { EventFormFieldsExpanded } from './components/EventFormFieldsExpanded'
import { FieldWithLabel } from './components/FieldWithLabel'
import {
  EventFormFieldsProps,
  EventFormHandle,
  EventFormValues
} from './EventFormFields.types'
import { CalendarSelectField } from './fields/CalendarSelectField'
import { EventDateTimeField } from './fields/EventDateTimeField'
import LocationField from './fields/LocationField'
import { TitleField } from './fields/TitleField'
import { VideoConferenceField } from './fields/VideoConferenceField'
import { validateEventFormValues } from './utils/formValidation'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { EventFormAttachments } from './fields/EventFormAttachments'
import { useEventFormValues } from './hooks/useEventFormValues'

const showInputLabel = (showMore: boolean, label: string): string =>
  showMore ? label : ''

function useEventFormImperativeHandle(
  ref: React.ForwardedRef<EventFormHandle>,
  {
    formValues,
    organizer,
    isTeamCalendar,
    isFormValid,
    isSpecific,
    showMore,
    tempStorageKey,
    tempStorageContext,
    onSubmit,
    onCancel
  }: {
    formValues: EventFormValues
    organizer: userOrganiser
    isTeamCalendar: boolean
    isFormValid: boolean
    isSpecific: boolean
    showMore: boolean
    tempStorageKey: 'create' | 'update'
    tempStorageContext?: EventFormContext
    onSubmit: (
      values: EventFormValues,
      organizer?: userOrganiser
    ) => Promise<void>
    onCancel: () => void
  }
): void {
  const organizerRef = useRef(organizer)
  useEffect(() => {
    organizerRef.current = isTeamCalendar
      ? formValues.organizer || organizer
      : organizer
  }, [isTeamCalendar, organizer, formValues.organizer])

  const latestValuesRef = useRef(formValues)
  useEffect(() => {
    latestValuesRef.current = {
      ...formValues,
      organizer: formValues.organizer || organizer
    }
  }, [formValues, organizer])

  useImperativeHandle(ref, () => ({
    submit: async (): Promise<void> => {
      if (!isFormValid && !isSpecific) return

      const values = { ...latestValuesRef.current }
      saveEventFormDataToTemp(tempStorageKey, {
        ...values,
        resources: values.selectedResources,
        ...tempStorageContext,
        fromError: false
      })
      await onSubmit(values, organizerRef.current)
    },
    cancel: (): void => onCancel(),
    getValues: (): EventFormValues => ({ ...latestValuesRef.current }),
    isValid: (): boolean =>
      validateEventFormValues(latestValuesRef.current, showMore)
  }))
}

const EventFormFields = forwardRef<EventFormHandle, EventFormFieldsProps>(
  (props, ref) => {
    const {
      initialValues,
      showMore,
      isOpen = false,
      typeOfAction,
      isSpecific = false,
      eventId,
      userPersonalCalendars,
      event,
      onSubmit,
      onCancel,
      tempStorageKey,
      tempStorageContext,
      onStartChange,
      onEndChange,
      onAllDayChange,
      onCalendarChange,
      onValidationChange,
      onDirtyChange
    } = props

    const { t } = useI18n()
    const { isTooSmall: isMobile } = useScreenSizeDetection()
    const inputSize = useResponsiveInputSize()

    const calList = useAppSelector(state => state.calendars.list)
    const userOrganizer = useAppSelector(state => state.user.organiserData)

    const [isFormValid, setIsFormValid] = useState(false)

    const timezoneList = useMemo(
      () => ({
        zones: Object.keys(TIMEZONES.zones).sort(),
        browserTz: resolveTimezone(browserDefaultTimeZone),
        getTimezoneOffset
      }),
      []
    )

    const {
      formValues,
      isDirty,
      setTitle,
      setDescription,
      setLocation,
      setStart,
      setEnd,
      setAllDay,
      setTimezone,
      setRepetition,
      setAttendees,
      setAlarms,
      setBusy,
      setEventClass,
      setCalendarid,
      setHasVideoConference,
      setMeetingLink,
      setSelectedResources,
      setShowDescription,
      setShowRepeat,
      setHasEndDateChanged,
      setAttachments,
      setOrganizer,
      handleAllDayChange
    } = useEventFormValues({
      initialValues,
      isOpen,
      tempStorageKey,
      tempStorageContext,
      onStartChange,
      onEndChange,
      onAllDayChange,
      userOrganizer,
      eventOrganizer: event?.organizer
    })

    useEffect(() => {
      onDirtyChange?.(isDirty)
    }, [isDirty, onDirtyChange])

    const handleValidationChange = useCallback(
      (valid: boolean) => {
        setIsFormValid(valid)
        onValidationChange?.(valid)
      },
      [onValidationChange]
    )

    const selectedCalendar = calList?.[formValues.calendarid]
    const isTeamCalendar = Boolean(selectedCalendar?.owner?.teamCalendar)

    const { organizer } = useEventOrganizer({
      calendarid: formValues.calendarid,
      eventId,
      calList,
      userOrganizer
    })

    useEffect(() => {
      if (!formValues.organizer && organizer) {
        setOrganizer(organizer)
      }
    }, [formValues.organizer, organizer, setOrganizer])

    useEffect(() => {
      onCalendarChange?.(formValues.calendarid)
    }, [formValues.calendarid, onCalendarChange])

    useEventFormImperativeHandle(ref, {
      formValues,
      organizer,
      isTeamCalendar,
      isFormValid,
      isSpecific,
      showMore,
      tempStorageKey,
      tempStorageContext,
      onSubmit,
      onCancel
    })

    const v = formValues
    const isExpanded = showMore && !isMobile

    return (
      <React.Fragment>
        <TitleField
          value={v.title}
          onChange={setTitle}
          showMore={showMore}
          isExpanded={isExpanded}
          isOpen={isOpen}
          eventId={eventId}
        />

        <EventDateTimeField
          start={v.start}
          setStart={setStart}
          end={v.end}
          setEnd={setEnd}
          allday={v.allday}
          setAllDay={setAllDay}
          timezone={v.timezone}
          setTimezone={setTimezone}
          repetition={v.repetition}
          setRepetition={setRepetition}
          showRepeat={v.showRepeat}
          setShowRepeat={setShowRepeat}
          showMore={showMore}
          timezoneList={timezoneList}
          typeOfAction={typeOfAction}
          onStartChange={onStartChange}
          onEndChange={onEndChange}
          onAllDayChange={handleAllDayChange}
          onHasEndDateChangedChange={setHasEndDateChanged}
          onValidationChange={handleValidationChange}
        />

        <FieldWithLabel
          label={showInputLabel(showMore, t('event.form.participants'))}
          isExpanded={isExpanded}
        >
          <AttendeeSelector
            attendees={v.attendees}
            setAttendees={setAttendees}
            start={v.start}
            eventUid={eventId}
            timezone={v.timezone}
            end={v.end}
            placeholder={t('event.form.addGuestsPlaceholder')}
            inputSlot={params => <TextField {...params} size={inputSize} />}
          />
        </FieldWithLabel>

        {window.VIDEO_CONFERENCE_BASE_URL && (
          <VideoConferenceField
            hasVideoConference={v.hasVideoConference}
            setHasVideoConference={setHasVideoConference}
            meetingLink={v.meetingLink}
            setMeetingLink={setMeetingLink}
            description={v.description}
            setDescription={setDescription}
            showMore={showMore}
            setShowDescription={setShowDescription}
          />
        )}

        <AddDescButton
          showDescription={v.showDescription}
          setShowDescription={setShowDescription}
          showMore={showMore}
          description={v.description}
          setDescription={setDescription}
        />

        <EventFormAttachments
          v={v}
          setAttachments={setAttachments}
          showMore={showMore}
          isExpanded={isExpanded}
        />

        <LocationField
          location={v.location}
          setLocation={setLocation}
          showMore={showMore}
          isOpen={isOpen}
        />

        <CalendarSelectField
          calendarid={v.calendarid}
          setCalendarid={setCalendarid}
          userPersonalCalendars={userPersonalCalendars}
          showMore={showMore}
          disabled={typeOfAction === 'solo'}
          onCalendarChange={onCalendarChange}
        />

        <EventFormFieldsExpanded
          alarms={v.alarms}
          setAlarms={setAlarms}
          busy={v.busy}
          setBusy={setBusy}
          eventClass={v.eventClass}
          setEventClass={setEventClass}
          showMore={showMore}
          selectedResources={v.selectedResources}
          setSelectedResources={setSelectedResources}
          userOrganizer={userOrganizer}
          selectedCalendar={selectedCalendar}
          isTeamCalendar={isTeamCalendar}
          isDisableOrganizerSelection={typeOfAction === 'solo'}
          setSelectedOrganizer={setOrganizer}
          selectedOrganizer={v.organizer}
          start={v.start}
          end={v.end}
          timezone={v.timezone}
          eventUid={eventId}
        />
      </React.Fragment>
    )
  }
)

EventFormFields.displayName = 'EventFormFields'

export default EventFormFields
