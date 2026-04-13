import {
  Box,
  Button,
  Dialog,
  DialogActions,
  Divider,
  IconButton,
  SxProps,
  TextField,
  Theme,
  Typography
} from '@linagora/twake-mui'
import AccessTime from '@mui/icons-material/AccessTime'
import KeyboardAltOutlined from '@mui/icons-material/KeyboardAltOutlined'
import { MobileTimePicker, renderTimeViewClock } from '@mui/x-date-pickers'
import { PickerValue } from '@mui/x-date-pickers/internals'
import { StaticTimePicker } from '@mui/x-date-pickers/StaticTimePicker'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { EditableTimeField } from '../EditableTimeField'
import { getTimeFieldSlotProps } from './dateTimePickerSlotProps'
import { TimePickerFieldProps } from './TimePickerField'

const TIME_DISPLAY_SX = {
  fontSize: '48px',
  fontWeight: 400
} as const

const TIME_INPUT_SX: SxProps<Theme> = {
  width: '96px',
  '& .MuiFilledInput-root': {
    ...TIME_DISPLAY_SX,
    color: 'text.secondary',
    backgroundColor: 'transparent !important',
    '&:before': { borderBottomColor: 'transparent !important' },
    '&:after': { borderBottomColor: 'transparent !important' }
  },
  '& .MuiFilledInput-input': {
    textAlign: 'center'
  },
  '& .MuiFilledInput-root.Mui-focused .MuiFilledInput-input': {
    backgroundColor: 'transparent !important',
    color: 'primary.main'
  }
}

const STATIC_PICKER_SX: SxProps<Theme> = {
  '& .MuiPickersToolbar-content': { justifyContent: 'center' },
  '& .MuiTimePickerToolbar-hourMinuteLabel': {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px'
  },
  '& .MuiTimePickerToolbar-hourMinuteLabel .MuiPickersToolbarText-root[data-selected]':
    { color: 'primary.main' },
  '& .MuiPickersToolbar-root .MuiTypography-root': TIME_DISPLAY_SX,
  '& .MuiPickersToolbar-title': { display: 'none' },
  '& .MuiPickersArrowSwitcher-root': { display: 'none' }
}

const padTwo = (n: number): string => String(n).padStart(2, '0')

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
}

const TimeInput: React.FC<TimeInputProps> = ({ value, onChange }) => (
  <TextField
    variant="filled"
    value={value}
    onFocus={e => e.target.select()}
    onChange={e => onChange(e.target.value)}
    sx={TIME_INPUT_SX}
  />
)

type DialogView = 'clock' | 'keyboard'

export const TouchTimePickerField: React.FC<TimePickerFieldProps> = ({
  value,
  onChange,
  testId,
  label,
  hasError = false,
  disabled = false
}) => {
  const { t } = useI18n()

  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState<PickerValue>(value)
  const [view, setView] = useState<DialogView>('clock')

  const handleOpen = (): void => {
    setInternalValue(value)
    setOpen(true)
  }

  const handleAccept = (): void => {
    onChange(internalValue)
    setOpen(false)
  }

  const handleCancel = (): void => {
    setOpen(false)
  }

  const handleHourChange = (raw: string): void => {
    if (!internalValue) return

    const h = parseInt(raw, 10)
    if (isNaN(h)) return
    if (h < 0 || h > 23) return

    setInternalValue(internalValue.minute(h))
  }

  const handleMinuteChange = (raw: string): void => {
    if (!internalValue) return

    const m = parseInt(raw, 10)
    if (isNaN(m)) return
    if (m < 0 || m > 59) return

    setInternalValue(internalValue.minute(m))
  }

  const toggleView = (): void =>
    setView(view === 'clock' ? 'keyboard' : 'clock')

  return (
    <>
      <MobileTimePicker
        ampm={false}
        value={value}
        onAccept={onChange}
        disabled={disabled}
        open={false}
        onOpen={handleOpen}
        viewRenderers={{
          hours: renderTimeViewClock,
          minutes: renderTimeViewClock
        }}
        slots={{ field: EditableTimeField }}
        slotProps={{
          openPickerButton: { sx: { display: 'none' } },
          field: {
            ...getTimeFieldSlotProps(testId, hasError, label),
            onFocus: e => e.target.blur()
          }
        }}
      />

      <Dialog open={open} onClose={handleCancel}>
        {view === 'clock' && (
          <StaticTimePicker
            ampm={false}
            value={internalValue}
            onChange={setInternalValue}
            viewRenderers={{
              hours: renderTimeViewClock,
              minutes: renderTimeViewClock
            }}
            slots={{ actionBar: () => null }}
            sx={STATIC_PICKER_SX}
          />
        )}

        {view === 'keyboard' && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              gap: '8px'
            }}
          >
            <TimeInput
              value={internalValue ? padTwo(internalValue.hour()) : '00'}
              onChange={handleHourChange}
            />
            <Typography sx={{ ...TIME_DISPLAY_SX, color: 'text.secondary' }}>
              :
            </Typography>
            <TimeInput
              value={internalValue ? padTwo(internalValue.minute()) : '00'}
              onChange={handleMinuteChange}
            />
          </Box>
        )}

        <Divider />

        <DialogActions
          sx={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <IconButton onClick={toggleView}>
            {view === 'clock' ? <KeyboardAltOutlined /> : <AccessTime />}
          </IconButton>
          <Box>
            <Button onClick={handleCancel} variant="text">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAccept} variant="contained">
              {t('common.ok')}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  )
}
