import React, { useCallback, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { FieldWithLabel } from '../components/FieldWithLabel'
import { useDateTimeSplit } from '../hooks/useDateTimeSplit'
import { DateTimeExpanded } from '../components/DateTimeFields/DateTimeExpanded'
import { DateTimeSummarySection } from '../components/DateTimeFields/DateTimeSubPanels'
import type { EventDateTimeFieldProps } from './DateTimeField.types'

export const EventDateTimeField: React.FC<EventDateTimeFieldProps> = ({
  start,
  setStart,
  end,
  setEnd,
  allday,
  setAllDay,
  timezone,
  setTimezone,
  repetition,
  setRepetition,
  showRepeat,
  setShowRepeat,
  showMore,
  timezoneList,
  typeOfAction,
  onStartChange,
  onEndChange,
  onAllDayChange,
  onHasEndDateChangedChange,
  onValidationChange
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const [hasClickedDateTimeSection, setHasClickedDateTimeSection] =
    useState(false)
  const [hasEndDateChanged, setHasEndDateChanged] = useState(false)

  // Validation callback for DateTimeField → notify parent
  const handleValidationChange = useCallback(
    (isValid: boolean) => {
      onValidationChange?.(isValid)
    },
    [onValidationChange]
  )

  const {
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime
  } = useDateTimeSplit({
    start,
    end,
    allday,
    showMore,
    hasEndDateChanged,
    setHasEndDateChanged,
    onEndChange,
    setEnd,
    onHasEndDateChangedChange,
    onValidationChange: handleValidationChange
  })

  const isCollapsed = !showMore && !hasClickedDateTimeSection

  return (
    <>
      <FieldWithLabel
        label={isCollapsed ? '' : t('event.form.dateTime')}
        isExpanded={showMore && !isMobile}
      >
        {isCollapsed ? (
          <DateTimeSummarySection
            startDate={startDate}
            startTime={startTime}
            endDate={endDate}
            endTime={endTime}
            allday={allday}
            timezone={timezone}
            repetition={repetition}
            hasEndDateChanged={hasEndDateChanged}
            onExpand={() => setHasClickedDateTimeSection(true)}
          />
        ) : (
          <DateTimeExpanded
            start={start}
            setStart={setStart}
            end={end}
            setEnd={setEnd}
            allday={allday}
            setAllDay={setAllDay}
            timezone={timezone}
            setTimezone={setTimezone}
            repetition={repetition}
            setRepetition={setRepetition}
            showRepeat={showRepeat}
            setShowRepeat={setShowRepeat}
            showMore={showMore}
            hasEndDateChanged={hasEndDateChanged}
            setHasEndDateChanged={setHasEndDateChanged}
            timezoneList={timezoneList}
            typeOfAction={typeOfAction}
            onStartChange={onStartChange}
            onEndChange={onEndChange}
            onAllDayChange={onAllDayChange}
            startDate={startDate}
            setStartDate={setStartDate}
            startTime={startTime}
            setStartTime={setStartTime}
            endDate={endDate}
            setEndDate={setEndDate}
            endTime={endTime}
            setEndTime={setEndTime}
          />
        )}
      </FieldWithLabel>
    </>
  )
}
