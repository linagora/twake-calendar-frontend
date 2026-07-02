import { RepetitionObject } from '@common/types/Repetition'
import React from 'react'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { DateTimeSummary } from '@common/components/Event/components/DateTimeSummary'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import RepeatEvent from '@common/components/Event/EventRepeat'

interface DateTimeSummarySectionProps {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allday: boolean
  timezone: string
  repetition: RepetitionObject
  hasEndDateChanged: boolean
  onExpand: () => void
}

export const DateTimeSummarySection: React.FC<DateTimeSummarySectionProps> = ({
  startDate,
  startTime,
  endDate,
  endTime,
  allday,
  timezone,
  repetition,
  hasEndDateChanged,
  onExpand
}) => {
  const isMultiDay = startDate !== endDate
  const showEndDate = allday || hasEndDateChanged || isMultiDay

  return (
    <DateTimeSummary
      startDate={startDate}
      startTime={startTime}
      endDate={endDate}
      endTime={endTime}
      allday={allday}
      timezone={timezone}
      repetition={repetition}
      showEndDate={showEndDate}
      onClick={onExpand}
    />
  )
}

interface DateTimeRepeatPanelProps {
  repetition: RepetitionObject
  setRepetition: (value: RepetitionObject) => void
  start: string
  typeOfAction?: 'solo' | 'all'
  showMore: boolean
}

export const DateTimeRepeatPanel: React.FC<DateTimeRepeatPanelProps> = ({
  repetition,
  setRepetition,
  start,
  typeOfAction,
  showMore
}) => {
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  return (
    <FieldWithLabel label="" isExpanded={showMore && !isMobile}>
      <RepeatEvent
        repetition={repetition}
        eventStart={new Date(start)}
        setRepetition={setRepetition}
        isOwn={typeOfAction !== 'solo'}
      />
    </FieldWithLabel>
  )
}
