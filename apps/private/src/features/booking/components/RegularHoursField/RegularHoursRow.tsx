import React from 'react'
import { Box, Typography, Switch, IconButton, Stack } from '@linagora/twake-mui'
import { Add, ContentCopy } from '@mui/icons-material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import { DayOfWeek, TimeSlot, isInvalidSlot } from './RegularHoursTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { Tooltip } from '@common/components/Tooltip'
import { useI18n } from 'twake-i18n'
import dayjs, { Dayjs } from 'dayjs'
import { TimePickerField } from '@common/components/Event/components/DateTimeFields/TimePickerField'
import { PickerValue } from '@mui/x-date-pickers/internals'

interface TimeSlotItemProps {
  day: DayOfWeek
  index: number
  slot: TimeSlot
  isEnabled: boolean
  handleTimeChange: (
    day: DayOfWeek,
    index: number,
    field: keyof TimeSlot,
    value: string
  ) => void
  handleAddSlot: (day: DayOfWeek) => void
  handleRemoveSlot: (day: DayOfWeek, index: number) => void
  handleCopySlot: (day: DayOfWeek, index: number) => void
}

const parseTime = (time?: string): Dayjs | null => {
  if (!time) return null
  return dayjs(`${dayjs().format('YYYY-MM-DD')}T${time}:00`)
}

const TimeSlotItem: React.FC<TimeSlotItemProps> = ({
  day,
  index,
  slot,
  isEnabled,
  handleTimeChange,
  handleAddSlot,
  handleRemoveSlot,
  handleCopySlot
}) => {
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const { t } = useI18n()

  const handleTimeChangeCallback =
    (field: keyof TimeSlot) =>
    (val: PickerValue): void => {
      const d = val as Dayjs | null
      if (d && d.isValid()) {
        handleTimeChange(day, index, field, d.format('HH:mm'))
      }
    }

  const startValue = parseTime(slot.start)
  const endValue = parseTime(slot.end)
  const hasError = isEnabled && isInvalidSlot(slot)
  const errorId = `slot-error-${day}-${index}`
  const width = isMobile ? '100%' : 110

  const isFirst = index === 0
  const actionTitle = isFirst ? t('booking.addSlot') : t('booking.removeSlot')
  const handleAction = (): void =>
    isFirst ? handleAddSlot(day) : handleRemoveSlot(day, index)
  const actionLabel = isFirst ? 'add-slot' : 'remove-slot'

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width }}>
          <TimePickerField
            testId={`start-time-${day}-${index}`}
            label={t('dateTimeFields.startTime')}
            value={startValue}
            onChange={handleTimeChangeCallback('start')}
            disabled={!isEnabled}
            hasError={hasError}
            errorId={errorId}
          />
        </Box>
        <Typography sx={{ mx: isMobile ? 0.5 : 1 }}>-</Typography>
        <Box sx={{ width }}>
          <TimePickerField
            testId={`end-time-${day}-${index}`}
            label={t('dateTimeFields.endTime')}
            value={endValue}
            onChange={handleTimeChangeCallback('end')}
            disabled={!isEnabled}
            hasError={hasError}
            errorId={errorId}
          />
        </Box>

        <Tooltip title={actionTitle}>
          <IconButton
            size="small"
            sx={{ ml: 1 }}
            disabled={!isEnabled}
            onClick={handleAction}
            aria-label={actionLabel}
          >
            {isFirst ? (
              <Add fontSize="small" />
            ) : (
              <DeleteOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title={t('booking.copySlot')}>
          <IconButton
            size="small"
            disabled={!isEnabled}
            onClick={() => handleCopySlot(day, index)}
            aria-label="copy-slot"
          >
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {hasError && (
        <Typography
          variant="caption"
          color="error"
          id={errorId}
          data-testid={errorId}
        >
          {t('event.validation.endAfterStart')}
        </Typography>
      )}
    </Box>
  )
}

interface RegularHoursRowProps {
  day: DayOfWeek
  isWorkingDay: boolean
  isEnabled: boolean
  slots: TimeSlot[]
  dayLabel: string
  handleToggleDay: (day: DayOfWeek) => void
  handleTimeChange: (
    day: DayOfWeek,
    index: number,
    field: keyof TimeSlot,
    value: string
  ) => void
  handleAddSlot: (day: DayOfWeek) => void
  handleRemoveSlot: (day: DayOfWeek, index: number) => void
  handleCopySlot: (day: DayOfWeek, index: number) => void
}

export const RegularHoursRow: React.FC<RegularHoursRowProps> = ({
  day,
  isEnabled,
  slots,
  dayLabel,
  handleToggleDay,
  handleTimeChange,
  handleAddSlot,
  handleRemoveSlot,
  handleCopySlot
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: 100,
          mt: 1,
          mr: 1
        }}
      >
        <Switch
          checked={isEnabled}
          onChange={() => handleToggleDay(day)}
          sx={{ mr: 1 }}
        />
        <Typography
          variant="body2"
          color={isEnabled ? 'textPrimary' : 'textSecondary'}
        >
          {dayLabel}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, opacity: isEnabled ? 1 : 0.5 }}>
        <Stack spacing={1}>
          {slots.map((slot, index) => (
            <TimeSlotItem
              key={index}
              day={day}
              index={index}
              slot={slot}
              isEnabled={isEnabled}
              handleTimeChange={handleTimeChange}
              handleAddSlot={handleAddSlot}
              handleRemoveSlot={handleRemoveSlot}
              handleCopySlot={handleCopySlot}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  )
}
