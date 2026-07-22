import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { store } from '@common/app/store'
import { extractEvents } from '@common/components/Calendar/utils/calendarUtils'
import { getCalendarDetail } from '@common/features/Calendars/CalendarSlice'
import { Calendar } from '@common/types/CalendarTypes'
import { formatDateToYYYYMMDDTHHMMSS } from '@common/utils/dateUtils'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { makeDisplayName } from '@common/utils/makeDisplayName'
import { renameDefault } from '@common/utils/renameDefault'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import {
  buildPrintPeriods,
  printDayjs as dayjs,
  PrintHeading,
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
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@linagora/twake-mui'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
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

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  open,
  onClose,
  selectedCalendars
}) => {
  const { t, lang } = useI18n()
  const dispatch = useAppDispatch()
  const visibleBookingLinks = useVisibleBookingLinks()
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const timezone =
    useAppSelector(state => state.settings.timeZone) ?? browserDefaultTimeZone

  const [scale, setScale] = useState<PrintScale>('week')
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs())
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs())
  const [loading, setLoading] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const applyQuickOption = (nextScale: PrintScale): void => {
    setScale(nextScale)
    setStartDate(dayjs().startOf(nextScale === 'week' ? 'isoWeek' : nextScale))
    setEndDate(dayjs().endOf(nextScale === 'week' ? 'isoWeek' : nextScale))
    setErrorKey(null)
  }

  const buildLabels = (): {
    documentTitle: string
    allDay: string
    noTitle: string
    weekPrefix: string
  } => ({
    documentTitle: t('print.documentTitle'),
    allDay: t('print.allDay'),
    noTitle: t('print.noTitle'),
    weekPrefix: t('print.weekPrefix')
  })

  // Per-calendar print: the heading names the (single) calendar and its owner.
  const buildHeading = (
    calendars: Record<string, Calendar>
  ): PrintHeading | undefined => {
    const calId = selectedCalendars[0]
    const calendar = calId ? calendars[calId] : undefined
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

    setErrorKey(null)
    setLoading(true)
    try {
      const match = {
        start: formatDateToYYYYMMDDTHHMMSS(periods[0].start.toDate()),
        end: formatDateToYYYYMMDDTHHMMSS(
          periods[periods.length - 1].end.toDate()
        )
      }
      await Promise.all(
        selectedCalendars.map(calId =>
          dispatch(getCalendarDetail({ calId, match }))
            .unwrap()
            .catch(() => undefined)
        )
      )

      const calendars = store.getState().calendars.list
      const rawEvents = extractEvents(selectedCalendars, calendars, {
        visibleBookingLinks
      })
      const events = selectPrintEvents(rawEvents, timezone, t('print.noTitle'))

      const html = renderPrintDocument({
        periods,
        events,
        locale: lang,
        labels: buildLabels(),
        heading: buildHeading(calendars)
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
                {t('print.period')}
              </Typography>
              <Stack direction="row" spacing={1}>
                <DatePicker
                  label={t('print.startDate')}
                  value={startDate}
                  onChange={value => setStartDate(value)}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
                <DatePicker
                  label={t('print.endDate')}
                  value={endDate}
                  onChange={value => setEndDate(value)}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button size="small" onClick={() => applyQuickOption('week')}>
                  {t('print.thisWeek')}
                </Button>
                <Button size="small" onClick={() => applyQuickOption('month')}>
                  {t('print.thisMonth')}
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
