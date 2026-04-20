import { RepetitionObject } from '@/features/Events/EventsTypes'
import {
  Box,
  FormControl,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography
} from '@linagora/twake-mui'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/fr'
import 'dayjs/locale/ru'
import 'dayjs/locale/vi'
import { useI18n } from 'twake-i18n'
import { ReadOnlyDateField } from './components/ReadOnlyPickerField'
import { LONG_DATE_FORMAT } from './utils/dateTimeFormatters'
import { FC_DAYS, WeekDaySelector } from './WeekDaySelector'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'

const numericSlotProps = {
  htmlInput: {
    inputMode: 'numeric'
  }
}

export const RepeatEvent: React.FC<{
  repetition: RepetitionObject
  eventStart: Date
  setRepetition: (repetition: RepetitionObject) => void
  isOwn?: boolean
}> = ({ repetition, eventStart, setRepetition, isOwn = true }) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  const day = new Date(eventStart)
  const dateCalendarLayoutSx = {
    '& .MuiDateCalendar-root.MuiDateCalendar-root': {
      width: '260px',
      maxWidth: '260px',
      padding: '0 15px'
    }
  }

  // Fully derived — occurrences takes priority over endDate
  const getEndOption = (): 'after' | 'on' | 'never' => {
    if (repetition.occurrences) return 'after'
    if (repetition.endDate) return 'on'
    return 'never'
  }

  const endOption = getEndOption()

  const defaultEndDate = dayjs(eventStart).add(1, 'day').format('YYYY-MM-DD')

  return (
    <Box>
      <Stack>
        {/* Interval */}
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <Typography variant="h6">{t('event.repeat.every')}</Typography>
          <TextField
            type="number"
            value={repetition.interval ?? 1}
            disabled={!isOwn}
            onChange={e =>
              setRepetition({
                ...repetition,
                interval: Number(e.target.value)
              })
            }
            size={isMobile ? 'medium' : 'small'}
            style={{ width: 80 }}
            slotProps={{
              htmlInput: {
                ...numericSlotProps.htmlInput,
                min: 1,
                'data-testid': 'repeat-interval',
                style: {
                  textAlign: 'center',
                  paddingRight: 5
                }
              }
            }}
          />
          <FormControl size="small" style={{ minWidth: 120 }}>
            <Select
              value={repetition.freq ?? 'daily'}
              disabled={!isOwn}
              onChange={(e: SelectChangeEvent) => {
                if (e.target.value === 'weekly') {
                  const jsDay = day.getDay()
                  const icsDay = days[(jsDay + 6) % 7]
                  setRepetition({
                    ...repetition,
                    freq: e.target.value,
                    byday: [icsDay]
                  })
                } else {
                  setRepetition({
                    ...repetition,
                    freq: e.target.value,
                    byday: null
                  })
                }
              }}
            >
              <MenuItem value="daily">
                {t('event.repeat.frequency.days')}
              </MenuItem>
              <MenuItem value="weekly">
                {t('event.repeat.frequency.weeks')}
              </MenuItem>
              <MenuItem value="monthly">
                {t('event.repeat.frequency.months')}
              </MenuItem>
              <MenuItem value="yearly">
                {t('event.repeat.frequency.years')}
              </MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Weekly selection */}
        {repetition.freq === 'weekly' && (
          <Box mb={2}>
            <WeekDaySelector
              selectedDays={(repetition.byday ?? [])
                .map(ics => FC_DAYS.find(d => d.ics === ics)?.fc ?? -1)
                .filter(d => d !== -1)}
              onChange={fcDays => {
                const icsDays = fcDays
                  .map(fc => FC_DAYS.find(d => d.fc === fc)?.ics ?? '')
                  .filter(Boolean)
                setRepetition({
                  ...repetition,
                  byday: icsDays.length > 0 ? icsDays : null
                })
              }}
              disabled={!isOwn}
            />
          </Box>
        )}

        {/* End options */}
        <Box>
          <Typography variant="h6" gutterBottom>
            {t('event.repeat.end.label')}
          </Typography>
          <RadioGroup
            value={endOption}
            onChange={e => {
              const value = e.target.value
              if (value === endOption) return

              if (value === 'never') {
                setRepetition({
                  ...repetition,
                  occurrences: null,
                  endDate: null
                })
              }
              if (value === 'after') {
                setRepetition({
                  ...repetition,
                  occurrences:
                    repetition.occurrences && repetition.occurrences > 0
                      ? repetition.occurrences
                      : 1,
                  endDate: null
                })
              }
              if (value === 'on') {
                setRepetition({
                  ...repetition,
                  occurrences: null,
                  endDate: repetition.endDate || defaultEndDate
                })
              }
            }}
          >
            <FormControlLabel
              disabled={!isOwn}
              value="never"
              control={<Radio />}
              label={
                <Typography variant="h6">
                  {t('event.repeat.end.never')}
                </Typography>
              }
            />

            <FormControlLabel
              disabled={!isOwn}
              value="on"
              sx={{ mt: 1 }}
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6">
                    {t('event.repeat.end.on')}
                  </Typography>
                  <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale={t('locale') ?? 'en'}
                  >
                    <Box
                      sx={{
                        width: 220,
                        '& .MuiInputBase-root': {
                          fontSize: isMobile ? 16 : 14
                        },
                        '& .MuiInputBase-input': {
                          fontSize: isMobile ? 16 : 14
                        }
                      }}
                    >
                      <DatePicker
                        sx={{ width: '100%' }}
                        format={LONG_DATE_FORMAT}
                        minDate={dayjs(eventStart)}
                        value={
                          repetition.endDate
                            ? dayjs(repetition.endDate)
                            : dayjs(defaultEndDate)
                        }
                        onChange={value => {
                          if (!value || !value.isValid()) return
                          const newDateStr = value.format('YYYY-MM-DD')
                          setRepetition({
                            ...repetition,
                            occurrences: null,
                            endDate: newDateStr
                          })
                        }}
                        onOpen={() => {
                          if (!isOwn || endOption === 'on') return
                          setRepetition({
                            ...repetition,
                            occurrences: null,
                            endDate: repetition.endDate || defaultEndDate
                          })
                        }}
                        slots={{ field: ReadOnlyDateField }}
                        slotProps={{
                          field: {},
                          layout: { sx: dateCalendarLayoutSx }
                        }}
                        disabled={!isOwn}
                      />
                    </Box>
                  </LocalizationProvider>
                </Box>
              }
            />

            <FormControlLabel
              disabled={!isOwn}
              value="after"
              control={<Radio />}
              sx={{ mt: 1 }}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6">
                    {t('event.repeat.end.after')}
                  </Typography>
                  <TextField
                    type="number"
                    size={isMobile ? 'medium' : 'small'}
                    value={repetition.occurrences || 1}
                    onChange={e => {
                      const value = Number(e.target.value)
                      setRepetition({
                        ...repetition,
                        endDate: null,
                        occurrences: value > 0 ? value : 1
                      })
                    }}
                    sx={{ width: 100 }}
                    disabled={!isOwn}
                    slotProps={{
                      htmlInput: {
                        ...numericSlotProps.htmlInput,
                        min: 1,
                        'data-testid': 'occurrences-input'
                      }
                    }}
                  />
                  <Typography variant="h6">
                    {t('event.repeat.end.occurrences')}
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </Box>
      </Stack>
    </Box>
  )
}

export default RepeatEvent
