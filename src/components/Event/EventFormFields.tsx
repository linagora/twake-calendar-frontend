import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useMemo
} from 'react'
import { useI18n } from 'twake-i18n'
import { useAppSelector } from '@/app/hooks'
import AttendeeSelector from '../Attendees/AttendeeSearch'
import { FieldWithLabel } from './components/FieldWithLabel'
import { AddDescButton } from './AddDescButton'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { CalendarSelectField } from './fields/CalendarSelectField'
import { EventDateTimeField } from './fields/EventDateTimeField'
import { VideoConferenceField } from './fields/VideoConferenceField'
import { EventFormFieldsExpanded } from './components/EventFormFieldsExpanded'
import LocationField from './fields/LocationField'
import { TitleField } from './fields/TitleField'
import { saveEventFormDataToTemp } from '@/utils/eventFormTempStorage'
import { useEventOrganizer } from '@/features/Events/useEventOrganizer'
import { useEventFormValues } from './hooks/useEventFormValues'
import { validateEventFormValues } from './utils/formValidation'
import { TIMEZONES } from '@/utils/timezone-data'
import {
  browserDefaultTimeZone,
  getTimezoneOffset,
  resolveTimezone
} from '@/utils/timezone'
import {
  EventFormFieldsProps,
  EventFormHandle,
  EventFormValues
} from './EventFormFields.types'
import { TextField } from '@linagora/twake-mui'

const showInputLabel = (showMore: boolean, label: string): string =>
  showMore ? label : ''

const EventFormFields = forwardRef<EventFormHandle, EventFormFieldsProps>(
  (props, ref) => {
    const {
      initialValues,
      showMore,
      isOpen = false,
      typeOfAction,
      eventId,
      userPersonalCalendars,
      onSubmit,
      onCancel,
      tempStorageKey,
      tempStorageContext,
      onStartChange,
      onEndChange,
      onAllDayChange,
      onValidationChange
    } = props

    const { t } = useI18n()
    const { isTooSmall: isMobile } = useScreenSizeDetection()

    const calList = useAppSelector(state => state.calendars.list)
    const userOrganizer = useAppSelector(state => state.user.organiserData)

    const [showValidationErrors, setShowValidationErrors] = useState(false)
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
      setTitle,
      setDescription,
      setLocation,
      setStart,
      setEnd,
      setAllDay,
      setTimezone,
      setRepetition,
      setAttendees,
      setAlarm,
      setBusy,
      setEventClass,
      setCalendarid,
      setHasVideoConference,
      setMeetingLink,
      setSelectedResources,
      setShowDescription,
      setShowRepeat,
      setHasEndDateChanged,
      handleAllDayChange
    } = useEventFormValues({
      initialValues,
      isOpen,
      tempStorageKey,
      tempStorageContext,
      onStartChange,
      onEndChange,
      onAllDayChange
    })

    const handleValidationChange = useCallback(
      (valid: boolean) => {
        setIsFormValid(valid)
        onValidationChange?.(valid)
      },
      [onValidationChange]
    )

    const { organizer } = useEventOrganizer({
      calendarid: formValues.calendarid,
      calList,
      userOrganizer
    })
    // Keep organizer in a ref so submit() can read it synchronously
    const organizerRef = useRef(organizer)
    useEffect(() => {
      organizerRef.current = organizer
    }, [organizer])

    // Use a ref to store the LATEST formValues so the imperative handlers
    // always have the current state without needing to be re-bound
    const latestValuesRef = useRef(formValues)
    useEffect(() => {
      latestValuesRef.current = formValues
    }, [formValues])

    useImperativeHandle(ref, () => ({
      submit: async (): Promise<void> => {
        setShowValidationErrors(true)
        if (!isFormValid) return
        setShowValidationErrors(false)

        const values = { ...latestValuesRef.current }

        // Save snapshot to temp storage before API call
        saveEventFormDataToTemp(tempStorageKey, {
          ...values,
          resources: values.selectedResources,
          ...tempStorageContext,
          fromError: false
        })

        await onSubmit(values)
      },
      cancel: (): void => {
        onCancel()
      },
      getValues: (): EventFormValues => ({ ...latestValuesRef.current }),
      isValid: (): boolean =>
        validateEventFormValues(latestValuesRef.current, showMore)
    }))

    const v = formValues
    const isExpanded = showMore && !isMobile

    return (
      <React.Fragment>
        <TitleField
          value={v.title}
          onChange={setTitle}
          isMobile={isMobile}
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
          showValidationErrors={showValidationErrors}
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
            inputSlot={params => (
              <TextField {...params} size={isMobile ? 'medium' : 'small'} />
            )}
          />
        </FieldWithLabel>

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

        <AddDescButton
          showDescription={v.showDescription}
          setShowDescription={setShowDescription}
          showMore={showMore}
          description={v.description}
          setDescription={setDescription}
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
          onCalendarChange={setCalendarid}
        />

        <EventFormFieldsExpanded
          alarm={v.alarm}
          setAlarm={setAlarm}
          busy={v.busy}
          setBusy={setBusy}
          eventClass={v.eventClass}
          setEventClass={setEventClass}
          showMore={showMore}
          selectedResources={v.selectedResources}
          setSelectedResources={setSelectedResources}
        />
      </React.Fragment>
    )
  }
)

EventFormFields.displayName = 'EventFormFields'

export default EventFormFields
