import { useAppSelector } from '@common/app/hooks'
import AttendeeSelector from '@common/components/Attendees/AttendeeSearch'
import { useEventOrganizer } from '@common/features/Events/useEventOrganizer'
import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { saveEventFormDataToTemp } from '@common/utils/eventFormTempStorage'
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
import { TdriveButton } from '@common/features/Tdrive/components/TdriveButton'
import { TdriveFile } from '@common/features/Tdrive/hooks/useTdrivePicker'
import { Attachment } from '@common/types/Attachment'
import { useEventFormValues } from './hooks/useEventFormValues'
import { validateEventFormValues } from './utils/formValidation'

const showInputLabel = (showMore: boolean, label: string): string =>
  showMore ? label : ''

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
      onSubmit,
      onCancel,
      tempStorageKey,
      tempStorageContext,
      onStartChange,
      onEndChange,
      onAllDayChange,
      onCalendarChange,
      onValidationChange
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
      eventId,
      calList,
      userOrganizer
    })

    useEffect(() => {
      onCalendarChange?.(formValues.calendarid)
    }, [formValues.calendarid, onCalendarChange])

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
        if (!isFormValid && !isSpecific) return

        const values = { ...latestValuesRef.current }

        // Save snapshot to temp storage before API call
        saveEventFormDataToTemp(tempStorageKey, {
          ...values,
          resources: values.selectedResources,
          ...tempStorageContext,
          fromError: false
        })

        await onSubmit(values, organizerRef.current)
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

    const handleTdriveFileSelected = useCallback(
      (file: TdriveFile): void => {
        // Convert Tdrive file to Attachment
        const attachment = new Attachment(
          file.url,
          file.type === 'sharingLink' ? 'text/uri-list' : undefined,
          file.name
        )
        setAttachments([...v.attachments, attachment])
      },
      [v.attachments, setAttachments]
    )

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
          attachments={v.attachments}
          setAttachments={setAttachments}
        />

        <TdriveButton
          onFileSelected={handleTdriveFileSelected}
          showMore={showMore}
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
        />
      </React.Fragment>
    )
  }
)

EventFormFields.displayName = 'EventFormFields'

export default EventFormFields
