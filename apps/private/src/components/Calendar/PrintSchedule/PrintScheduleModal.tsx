import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { store } from '@common/app/store'
import { extractEvents } from '@common/components/Calendar/utils/calendarUtils'
import { getCalendarDetail } from '@common/features/Calendars/CalendarSlice'
import { formatDateToYYYYMMDDTHHMMSS } from '@common/utils/dateUtils'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { makeDisplayName } from '@common/utils/makeDisplayName'
import { renameDefault } from '@common/utils/renameDefault'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import {
  buildPrintPeriods,
  MAX_PRINT_PERIODS,
  printDayjs as dayjs,
  PrintCalendar,
  PrintHeading,
  PrintLayout,
  PrintScale,
  renderPrintDocument,
  selectPrintEvents
} from '@common/utils/printSchedule'
import { TwakeLocalizationProvider } from '@common/components/DateTimePicker/TwakeLocalizationProvider'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@linagora/twake-mui'
import { DatePickerField } from '@common/components/Event/components/DateTimeFields/DatePickerField'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import { Dayjs } from 'dayjs'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { useVisibleBookingLinks } from '../hooks/useVisibleBookingLinks'

export interface PrintScheduleModalProps {
  open: boolean
  onClose: () => void
  selectedCalendars: string[]
}

const SCALES: PrintScale[] = ['day', 'week', 'month']
const LAYOUTS: PrintLayout[] = ['grid', 'schedule']

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  open,
  onClose,
  selectedCalendars
}) => {
  const { t, lang } = useI18n()
  const dispatch = useAppDispatch()
  const visibleBookingLinks = useVisibleBookingLinks()
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const hideDeclinedEvents = useAppSelector(
    state => state.settings.hideDeclinedEvents
  )
  const calendarsList = useAppSelector(state => state.calendars.list)
  const timezone =
    useAppSelector(state => state.settings.timeZone) ?? browserDefaultTimeZone

  const [scale, setScale] = useState<PrintScale>('week')
  const [layout, setLayout] = useState<PrintLayout>('grid')
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs())
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs())
  const [additionalCalendars, setAdditionalCalendars] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const addCalendarRow = (): void =>
    setAdditionalCalendars(prev => [...prev, ''])
  const updateCalendarRow = (index: number, value: string): void =>
    setAdditionalCalendars(prev =>
      prev.map((calId, i) => (i === index ? value : calId))
    )
  const removeCalendarRow = (index: number): void =>
    setAdditionalCalendars(prev => prev.filter((_, i) => i !== index))

  // Calendars a given extra row may pick: any calendar not already the primary
  // one nor chosen in another row.
  const calendarOptions = (index: number): string[] => {
    const taken = new Set([
      ...selectedCalendars,
      ...additionalCalendars.filter((_, i) => i !== index)
    ])
    return Object.keys(calendarsList).filter(id => !taken.has(id))
  }

  // Quick options only move the date range; the chosen granularity is left as
  // the user set it.
  const applyQuickRange = (unit: 'week' | 'month'): void => {
    const rangeUnit = unit === 'week' ? 'isoWeek' : 'month'
    setStartDate(dayjs().startOf(rangeUnit))
    setEndDate(dayjs().endOf(rangeUnit))
    setErrorKey(null)
  }

  const buildLabels = (): {
    documentTitle: string
    allDay: string
    noTitle: string
    weekPrefix: string
    noEvents: string
  } => ({
    documentTitle: t('print.documentTitle'),
    allDay: t('print.allDay'),
    noTitle: t('print.noTitle'),
    weekPrefix: t('print.weekPrefix'),
    noEvents: t('print.noEvents')
  })

  // Names a calendar (and its owner) for the printed page headers.
  const headingFor = (calId: string): PrintHeading | undefined => {
    const calendar = calendarsList[calId]
    if (!calendar) return undefined
    const ownerName = makeDisplayName(calendar)
    const isOwnCalendar = extractEventBaseUuid(calId) === userId
    return {
      calendarName: renameDefault(
        calendar.name,
        ownerName ?? '',
        t,
        isOwnCalendar
      ),
      ownerName
    }
  }

  const calendarLabel = (calId: string): string => {
    const heading = headingFor(calId)
    if (!heading) return calId
    return heading.ownerName
      ? `${heading.calendarName} · ${heading.ownerName}`
      : heading.calendarName
  }

  const handlePrint = async (): Promise<void> => {
    if (!startDate || !endDate) return
    const rangeStart = dayjs
      .tz(startDate.format('YYYY-MM-DD'), timezone)
      .startOf('day')
    const rangeEnd = dayjs
      .tz(endDate.format('YYYY-MM-DD'), timezone)
      .startOf('day')
    if (rangeEnd.isBefore(rangeStart)) {
      setErrorKey('print.invalidRange')
      return
    }

    const periods = buildPrintPeriods(scale, rangeStart, rangeEnd, {
      locale: lang,
      weekPrefix: t('print.weekPrefix')
    })
    if (periods.length === 0) return

    // buildPrintPeriods silently caps at MAX_PRINT_PERIODS; a last page that
    // does not reach rangeEnd means the range was truncated. Gate printing so
    // the user narrows the range rather than getting a silently clipped output.
    const lastPeriodEnd = periods[periods.length - 1].end
    if (
      periods.length >= MAX_PRINT_PERIODS &&
      !lastPeriodEnd.isAfter(rangeEnd)
    ) {
      setErrorKey('print.tooManyPages')
      return
    }

    setErrorKey(null)
    setLoading(true)
    try {
      const match = {
        start: formatDateToYYYYMMDDTHHMMSS(periods[0].start.toDate()),
        end: formatDateToYYYYMMDDTHHMMSS(
          periods[periods.length - 1].end.toDate()
        )
      }
      const calIds = Array.from(
        new Set([...selectedCalendars, ...additionalCalendars.filter(Boolean)])
      )
      const fetchResults = await Promise.all(
        calIds.map(calId =>
          dispatch(getCalendarDetail({ calId, match }))
            .unwrap()
            .then(() => true)
            .catch(() => false)
        )
      )
      if (!fetchResults.some(Boolean)) {
        setErrorKey('print.fetchFailed')
        return
      }

      const calendars = store.getState().calendars.list
      const printCalendars: PrintCalendar[] = calIds.map(calId => ({
        heading: headingFor(calId),
        events: selectPrintEvents(
          extractEvents([calId], calendars, {
            hideDeclinedEvents,
            visibleBookingLinks
          }),
          timezone,
          t('print.noTitle')
        )
      }))

      const html = renderPrintDocument({
        periods,
        calendars: printCalendars,
        locale: lang,
        layout,
        labels: buildLabels()
      })

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        setErrorKey('print.popupBlocked')
        return
      }
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
      onClose()
    } catch {
      setErrorKey('print.failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('print.title')}</DialogTitle>
      <DialogContent>
        <TwakeLocalizationProvider>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t('print.scale')}
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={scale}
                onChange={(_, value: PrintScale | null) =>
                  value && setScale(value)
                }
                size="small"
              >
                {SCALES.map(value => (
                  <ToggleButton key={value} value={value}>
                    {t(`print.scale_${value}`)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t('print.layout')}
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={layout}
                onChange={(_, value: PrintLayout | null) =>
                  value && setLayout(value)
                }
                size="small"
              >
                {LAYOUTS.map(value => (
                  <ToggleButton key={value} value={value}>
                    {t(`print.layout_${value}`)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t('print.period')}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <DatePickerField
                    value={startDate}
                    onChange={value => setStartDate(value)}
                    testId="print-start-date"
                    label={t('print.startDate')}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <DatePickerField
                    value={endDate}
                    onChange={value => setEndDate(value)}
                    testId="print-end-date"
                    label={t('print.endDate')}
                  />
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button size="small" onClick={() => applyQuickRange('week')}>
                  {t('print.thisWeek')}
                </Button>
                <Button size="small" onClick={() => applyQuickRange('month')}>
                  {t('print.thisMonth')}
                </Button>
              </Stack>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t('print.additionalCalendars')}
              </Typography>
              <Stack spacing={1}>
                {additionalCalendars.map((calId, index) => (
                  <Stack
                    key={index}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                  >
                    <Select
                      size="small"
                      fullWidth
                      displayEmpty
                      value={calId}
                      onChange={e => updateCalendarRow(index, e.target.value)}
                    >
                      <MenuItem value="" disabled>
                        {t('print.selectCalendar')}
                      </MenuItem>
                      {calendarOptions(index).map(id => (
                        <MenuItem key={id} value={id}>
                          {calendarLabel(id)}
                        </MenuItem>
                      ))}
                    </Select>
                    <IconButton
                      size="small"
                      aria-label={t('actions.remove')}
                      onClick={() => removeCalendarRow(index)}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addCalendarRow}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {t('print.addCalendar')}
                </Button>
              </Stack>
            </Box>

            {errorKey && (
              <Typography variant="body2" color="error">
                {t(errorKey)}
              </Typography>
            )}
          </Stack>
        </TwakeLocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={() => void handlePrint()}
          disabled={loading || selectedCalendars.length === 0}
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {t('print.generate')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
