import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import EditIcon from '@mui/icons-material/Edit'
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Typography
} from '@linagora/twake-mui'
import { DateField, DatePicker } from '@mui/x-date-pickers'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { PickerValue } from '@mui/x-date-pickers/internals'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import React, { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { ReadOnlyDateField } from '../ReadOnlyPickerField'
import { DatePickerFieldProps } from './DatePickerField'
import {
  dateCalendarLayoutSx,
  getDateFieldSlotProps,
  getDateSlotProps
} from './dateTimePickerSlotProps'

dayjs.extend(customParseFormat)

const DISPLAY_FORMAT = 'D MMMM, YYYY'

interface DatePickerDialogProps {
  value: PickerValue
  onChange: (value: PickerValue) => void
  onAccept: (value: PickerValue) => void
  onCancel: () => void
}

const DatePickerDialogContent: React.FC<DatePickerDialogProps> = ({
  value,
  onChange,
  onAccept,
  onCancel
}) => {
  const { t } = useI18n()

  const [viewMode, setViewMode] = useState<'calendar' | 'text'>('calendar')

  const [internalValue, setInternalValue] = useState<PickerValue>(value)

  const handleInternalChange = (newValue: PickerValue): void => {
    setInternalValue(newValue)
    onChange(newValue)
  }

  const handleToggleView = (): void => {
    setViewMode(viewMode === 'calendar' ? 'text' : 'calendar')
  }

  const displayDate = internalValue?.isValid()
    ? internalValue.format(DISPLAY_FORMAT)
    : t('dateTimeFields.pickADate')

  return (
    <Box sx={{ p: 2, width: 280 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 1,
          gap: 1
        }}
      >
        <Typography variant="subtitle1" fontWeight={500}>
          {displayDate}
        </Typography>
        <IconButton
          size="small"
          onClick={handleToggleView}
          aria-label={
            viewMode === 'calendar'
              ? t('dateTimeFields.switchToTextInput')
              : t('dateTimeFields.switchToCalendar')
          }
        >
          {viewMode === 'calendar' ? (
            <EditIcon fontSize="small" />
          ) : (
            <CalendarTodayIcon fontSize="small" />
          )}
        </IconButton>
      </Box>

      {/* Body */}
      {viewMode === 'calendar' ? (
        <DateCalendar
          value={internalValue}
          onChange={handleInternalChange}
          sx={{ m: 0, width: '100%' }}
        />
      ) : (
        <Box sx={{ mt: 1, mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t('dateTimeFields.date')}
          </Typography>
          <DateField
            fullWidth
            inputMode="numeric"
            size="medium"
            value={internalValue}
            onChange={handleInternalChange}
            autoFocus
            slotProps={{
              textField: {
                inputProps: { inputMode: 'numeric', pattern: '[0-9]*' }
              }
            }}
          />
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1
        }}
      >
        <Button onClick={onCancel} variant="text">
          {t('common.cancel')}
        </Button>
        <Button onClick={() => onAccept(internalValue)} variant="contained">
          {t('common.ok')}
        </Button>
      </Box>
    </Box>
  )
}

export const TouchDatePickerField: React.FC<DatePickerFieldProps> = ({
  value,
  onChange,
  testId,
  label = 'Date',
  hasError = false
}) => {
  const [open, setOpen] = useState(false)
  const [pendingValue, setPendingValue] = useState<PickerValue>(value)

  const handleOpen = (): void => {
    setPendingValue(value)
    setOpen(true)
  }

  const handleAccept = (newValue: PickerValue): void => {
    onChange(newValue)
    setOpen(false)
  }

  const handleCancel = (): void => {
    setPendingValue(value)
    setOpen(false)
  }

  return (
    <>
      <DatePicker
        label={label}
        value={value}
        onOpen={handleOpen}
        onAccept={onChange}
        open={false}
        slots={{ field: ReadOnlyDateField }}
        slotProps={{
          openPickerButton: { sx: { display: 'none' } },
          ...getDateSlotProps(testId, hasError, label, true),
          field: getDateFieldSlotProps(testId, hasError, label, true),
          layout: { sx: dateCalendarLayoutSx }
        }}
      />
      <Dialog
        open={open}
        onClose={handleCancel}
        slotProps={{ paper: { sx: { borderRadius: 2, overflow: 'hidden' } } }}
      >
        <DatePickerDialogContent
          value={pendingValue}
          onChange={setPendingValue}
          onAccept={handleAccept}
          onCancel={handleCancel}
        />
      </Dialog>
    </>
  )
}
