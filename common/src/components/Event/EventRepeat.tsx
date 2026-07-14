import { RepetitionObject } from '@common/types/Repetition'
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TwakeLocalizationProvider } from '@common/components/DateTimePicker'
import dayjs from 'dayjs'
import { useI18n } from 'twake-i18n'
import { ReadOnlyDateField } from './components/ReadOnlyPickerField'
import { LONG_DATE_FORMAT } from './utils/dateTimeFormatters'
import { FC_DAYS, WeekDaySelector } from './WeekDaySelector'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import {
  preventFloatNumber,
  toPositiveInt
} from '@common/utils/preventFloatNumber'
import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'
import { getDateFieldSlotProps } from './components/DateTimeFields/dateTimePickerSlotProps'
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
  const inputSize = useResponsiveInputSize()
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h6">{t('event.repeat.every')}</Typography>
          <TextField
            type="number"
            value={repetition.interval ?? 1}
            onKeyDown={preventFloatNumber}
            disabled={!isOwn}
            onChange={e =>
              setRepetition(
                new RepetitionObject({
                  ...repetition,
                  interval: toPositiveInt(e.target.value)
                })
              )
            }
            size={inputSize}
            style={{ width: 80 }}
            slotProps={{
              htmlInput: {
                ...numericSlotProps.htmlInput,
                min: 1,
                step: 1,
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
                  setRepetition(
                    new RepetitionObject({
                      ...repetition,
                      freq: e.target.value,
                      byday: [icsDay]
                    })
                  )
                } else {
                  setRepetition(
                    new RepetitionObject({
                      ...repetition,
                      freq: e.target.value,
                      byday: null
                    })
                  )
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
          <Box sx={{ mb: 2 }}>
            <WeekDaySelector
              selectedDays={(repetition.byday ?? [])
                .map(ics => FC_DAYS.find(d => d.ics === ics)?.fc ?? -1)
                .filter(d => d !== -1)}
              onChange={fcDays => {
                const icsDays = fcDays
                  .map(fc => FC_DAYS.find(d => d.fc === fc)?.ics ?? '')
                  .filter(Boolean)
                setRepetition(
                  new RepetitionObject({
                    ...repetition,
                    byday: icsDays.length > 0 ? icsDays : null
                  })
                )
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
                setRepetition(
                  new RepetitionObject({
                    ...repetition,
                    occurrences: null,
                    endDate: null
                  })
                )
              }
              if (value === 'after') {
                setRepetition(
                  new RepetitionObject({
                    ...repetition,
                    occurrences:
                      repetition.occurrences && repetition.occurrences > 0
                        ? repetition.occurrences
                        : 1,
                    endDate: null
                  })
                )
              }
              if (value === 'on') {
                setRepetition(
                  new RepetitionObject({
                    ...repetition,
                    occurrences: null,
                    endDate: repetition.endDate || defaultEndDate
                  })
                )
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">
                    {t('event.repeat.end.on')}
                  </Typography>
                  <TwakeLocalizationProvider>
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
                          setRepetition(
                            new RepetitionObject({
                              ...repetition,
                              occurrences: null,
                              endDate: newDateStr
                            })
                          )
                        }}
                        onOpen={() => {
                          if (!isOwn || endOption === 'on') return
                          setRepetition(
                            new RepetitionObject({
                              ...repetition,
                              occurrences: null,
                              endDate: repetition.endDate || defaultEndDate
                            })
                          )
                        }}
                        slots={{ field: ReadOnlyDateField }}
                        slotProps={{
                          field: getDateFieldSlotProps(
                            'event-repeat-end-date',
                            false,
                            undefined,
                            isMobile
                          ),
                          layout: { sx: dateCalendarLayoutSx }
                        }}
                        disabled={!isOwn}
                      />
                    </Box>
                  </TwakeLocalizationProvider>
                </Box>
              }
            />

            <FormControlLabel
              disabled={!isOwn}
              value="after"
              control={<Radio />}
              sx={{ mt: 1 }}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">
                    {t('event.repeat.end.after')}
                  </Typography>
                  <TextField
                    type="number"
                    size={inputSize}
                    value={repetition.occurrences || 1}
                    onChange={e => {
                      const value = toPositiveInt(e.target.value)
                      setRepetition(
                        new RepetitionObject({
                          ...repetition,
                          endDate: null,
                          occurrences: value > 0 ? value : 1
                        })
                      )
                    }}
                    sx={{ width: 100 }}
                    onKeyDown={preventFloatNumber}
                    disabled={!isOwn}
                    slotProps={{
                      htmlInput: {
                        ...numericSlotProps.htmlInput,
                        min: 1,
                        step: 1,
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
