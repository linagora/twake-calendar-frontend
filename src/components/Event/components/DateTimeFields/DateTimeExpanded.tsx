import { RepetitionObject } from '@/features/Events/EventsTypes'
import { getTimezoneOffset } from '@/utils/timezone'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Typography
} from '@linagora/twake-mui'
import ArrowDropDown from '@mui/icons-material/ArrowDropDown'
import React, { useCallback, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { DateTimeFields } from './DateTimeFields'
import { FieldWithLabel } from '../FieldWithLabel'
import { useAllDayToggle } from '../../hooks/useAllDayToggle'
import { combineDateTime } from '../../utils/dateTimeHelpers'
import { validateEventForm } from '../../utils/formValidation'
import type {
  EventDateTimeFieldProps,
  TimezoneListResult
} from '../../fields/DateTimeField.types'
import { TimezoneAutocomplete } from '@/components/Timezone/TimezoneAutocomplete'
import { SmallTimezoneSelector } from '@/components/Timezone/SmallTimeZoneSelector'
import { DateTimeRepeatPanel } from './DateTimeSubPanels'

interface DateTimeControlsRowProps {
  allday: boolean
  handleAllDayToggle: () => void
  showRepeat: boolean
  setShowRepeat: (value: boolean) => void
  typeOfAction?: 'solo' | 'all'
  repetition: RepetitionObject
  setRepetition: (value: RepetitionObject) => void
  start: string
  timezone: string
  setTimezone: (value: string) => void
  timezoneList: TimezoneListResult
  showMore: boolean
  offset: string
  tzLabel: string | undefined
}

const DateTimeControlsRow: React.FC<DateTimeControlsRowProps> = ({
  allday,
  handleAllDayToggle,
  showRepeat,
  setShowRepeat,
  typeOfAction,
  repetition,
  setRepetition,
  start,
  timezone,
  setTimezone,
  timezoneList,
  showMore,
  offset,
  tzLabel
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const [timezoneDrawerOpen, setTimezoneDrawerOpen] = useState(false)

  const handleRepeatToggle = (): void => {
    const newShowRepeat = !showRepeat
    setShowRepeat(newShowRepeat)
    if (newShowRepeat) {
      const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
      const parsed = new Date(start)
      const eventStartDate = isNaN(parsed.getTime()) ? new Date() : parsed
      const jsDay = eventStartDate.getDay()
      const icsDay = days[(jsDay + 6) % 7]
      setRepetition({
        freq: 'weekly',
        interval: 1,
        occurrences: 0,
        endDate: '',
        byday: [icsDay]
      } as RepetitionObject)
    } else {
      setRepetition({
        freq: '',
        interval: 1,
        occurrences: 0,
        endDate: '',
        byday: null
      } as RepetitionObject)
    }
  }

  return (
    <FieldWithLabel label=" " isExpanded={showMore && !isMobile}>
      <Box
        display="flex"
        gap={2}
        alignItems={isMobile ? 'start' : 'center'}
        flexDirection={isMobile ? 'column' : 'row'}
      >
        <Box>
          <FormControlLabel
            control={
              <Checkbox checked={allday} onChange={handleAllDayToggle} />
            }
            label={
              <Typography variant="h6">{t('event.form.allDay')}</Typography>
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={
                  showRepeat || (typeOfAction === 'solo' && !!repetition?.freq)
                }
                disabled={typeOfAction === 'solo'}
                onChange={handleRepeatToggle}
              />
            }
            label={
              <Typography variant="h6">{t('event.form.repeat')}</Typography>
            }
          />
        </Box>

        {/* Timezone selector */}
        {isMobile ? (
          <>
            <Button
              variant="text"
              size="small"
              onClick={() => setTimezoneDrawerOpen(true)}
              sx={{ textTransform: 'none', px: 0, color: 'text.secondary' }}
            >
              <Typography variant="h6">
                ({offset}) {tzLabel}
              </Typography>
              <ArrowDropDown />
            </Button>
            <SmallTimezoneSelector
              open={timezoneDrawerOpen}
              onClose={() => setTimezoneDrawerOpen(false)}
              value={timezone}
              onChange={tz => {
                setTimezone(tz)
                setTimezoneDrawerOpen(false)
              }}
              referenceDate={new Date(start)}
            />
          </>
        ) : (
          <TimezoneAutocomplete
            value={timezone}
            onChange={setTimezone}
            zones={timezoneList.zones}
            getTimezoneOffset={(tzName: string) =>
              timezoneList.getTimezoneOffset(tzName, new Date(start))
            }
            showIcon={false}
            width={220}
            size="small"
            placeholder={t('event.form.timezonePlaceholder')}
            hideBorder
            inputPadding="8px 65px 8px 0px"
          />
        )}
      </Box>
    </FieldWithLabel>
  )
}

export const DateTimeExpanded: React.FC<
  Pick<
    EventDateTimeFieldProps,
    | 'start'
    | 'setStart'
    | 'end'
    | 'setEnd'
    | 'allday'
    | 'setAllDay'
    | 'timezone'
    | 'setTimezone'
    | 'repetition'
    | 'setRepetition'
    | 'showRepeat'
    | 'setShowRepeat'
    | 'showMore'
    | 'showValidationErrors'
    | 'timezoneList'
    | 'typeOfAction'
    | 'onStartChange'
    | 'onEndChange'
    | 'onAllDayChange'
  > & {
    startDate: string
    startTime: string
    endDate: string
    endTime: string
    hasEndDateChanged: boolean
    setStartTime: (time: string) => void
    setEndTime: (time: string) => void
    setStartDate: (date: string) => void
    setEndDate: (date: string) => void
    setHasEndDateChanged: (isEndDateChanged: boolean) => void
  }
> = ({
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
  hasEndDateChanged,
  setHasEndDateChanged,
  showValidationErrors,
  timezoneList,
  typeOfAction,
  onStartChange,
  onEndChange,
  onAllDayChange,
  startDate,
  startTime,
  endDate,
  endTime,
  setStartTime,
  setEndTime,
  setStartDate,
  setEndDate
}) => {
  const { handleAllDayToggle } = useAllDayToggle({
    allday,
    start,
    end,
    startDate,
    startTime,
    endDate,
    endTime,
    setStartTime,
    setEndTime,
    setStart,
    setEnd,
    setAllDay,
    onAllDayChange
  })

  const validation = validateEventForm({
    startDate,
    startTime,
    endDate,
    endTime,
    allday,
    showValidationErrors,
    hasEndDateChanged,
    showMore
  })

  const isMultiDayRange = startDate !== endDate
  const endDateExplicitlySet = hasEndDateChanged && isMultiDayRange
  const endDateImplicitlyVisible = !allday && isMultiDayRange
  const showEndDate =
    showMore || allday || endDateExplicitlySet || endDateImplicitlyVisible

  const offset = getTimezoneOffset(
    timezone ? timezone : timezoneList.browserTz,
    new Date(start)
  )
  const tzLabel = timezone
    ? timezone.split('/').pop()?.replace(/_/g, ' ')
    : timezoneList.browserTz

  const repeatIsActive =
    showRepeat || (typeOfAction === 'solo' && Boolean(repetition?.freq))

  const handleStartDateChange = useCallback(
    (newDate: string, newTime?: string) => {
      setStartDate(newDate)
      const newStart = combineDateTime(newDate, newTime ?? startTime)
      setStart(newStart)
      if (onStartChange) {
        onStartChange(newStart)
      }
    },
    [setStartDate, startTime, onStartChange, setStart]
  )

  const handleStartTimeChange = useCallback(
    (newTime: string, newDate?: string) => {
      setStartTime(newTime)
      const newStart = combineDateTime(newDate ?? startDate, newTime)
      setStart(newStart)
      if (onStartChange) {
        onStartChange(newStart)
      }
    },
    [setStartTime, startDate, onStartChange, setStart]
  )

  const handleEndDateChange = useCallback(
    (newDate: string, newTime?: string) => {
      setEndDate(newDate)
      if (showMore) setHasEndDateChanged(true)
      const newEnd = combineDateTime(newDate, newTime ?? endTime)
      setEnd(newEnd)
      if (onEndChange) {
        onEndChange(newEnd)
      }
    },
    [setEndDate, showMore, setHasEndDateChanged, endTime, onEndChange, setEnd]
  )

  const handleEndTimeChange = useCallback(
    (newTime: string, newDate?: string) => {
      setEndTime(newTime)
      const newEnd = combineDateTime(newDate ?? endDate, newTime)
      setEnd(newEnd)
      if (onEndChange) {
        onEndChange(newEnd)
      }
    },
    [endDate, onEndChange, setEnd, setEndTime]
  )

  return (
    <>
      <DateTimeFields
        startDate={startDate}
        startTime={startTime}
        endDate={endDate}
        endTime={endTime}
        allday={allday}
        showMore={showMore}
        hasEndDateChanged={hasEndDateChanged}
        validation={validation}
        onStartDateChange={handleStartDateChange}
        onStartTimeChange={handleStartTimeChange}
        onEndDateChange={handleEndDateChange}
        onEndTimeChange={handleEndTimeChange}
        showEndDate={showEndDate}
        onToggleEndDate={() => {}}
      />

      {/* All-day, Repeat checkboxes + Timezone selector row */}
      <DateTimeControlsRow
        allday={allday}
        handleAllDayToggle={handleAllDayToggle}
        showRepeat={showRepeat}
        setShowRepeat={setShowRepeat}
        typeOfAction={typeOfAction}
        repetition={repetition}
        setRepetition={setRepetition}
        start={start}
        timezone={timezone}
        setTimezone={setTimezone}
        timezoneList={timezoneList}
        showMore={showMore}
        offset={offset}
        tzLabel={tzLabel}
      />

      {repeatIsActive && (
        <DateTimeRepeatPanel
          repetition={repetition}
          setRepetition={setRepetition}
          start={start}
          typeOfAction={typeOfAction}
          showMore={showMore}
        />
      )}
    </>
  )
}
