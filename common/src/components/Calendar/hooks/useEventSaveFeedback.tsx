import type { MutableRefObject } from 'react'
import type { CalendarApi } from '@fullcalendar/core'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { Button } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import moment from 'moment-timezone'
import { SnackbarAlert } from '@common/components/Loading/SnackBarAlert'
import {
  dismissEventSaveFeedback,
  type SavedEvent
} from '@common/features/Events/eventSaveFeedbackSlice'
import { isWithinRange } from '../utils/isWithinRange'

type Period = { start: Date; end: Date } | null

function getEventDate(event: SavedEvent, timezone: string): Date {
  return event.allday
    ? moment.tz(event.start.slice(0, 10), timezone).toDate()
    : new Date(event.start)
}

function isOutsidePeriod(date: Date, period: Period): boolean {
  return !period || !isWithinRange(date, period.start, period.end)
}

function formatSavedDate(
  date: Date,
  savedAt: number,
  timezone: string,
  locale: string
): string {
  const sameYear =
    moment.tz(date, timezone).year() === moment.tz(savedAt, timezone).year()
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: timezone
  })
}

export function useEventSaveFeedback(
  calendarRef: MutableRefObject<CalendarApi | null>,
  timezone: string,
  showEventPreview: (event: SavedEvent, date: Date) => void,
  displayedPeriod: Period
): JSX.Element | null {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const notice = useAppSelector(state => state.eventSaveFeedback.notice)
  if (!notice) return null

  const date = getEventDate(notice.event, timezone)
  const closeNotice = (): void => {
    dispatch(dismissEventSaveFeedback(notice.id))
  }
  const handleSetOpen = (open: boolean): void => {
    if (!open) closeNotice()
  }

  if (!isOutsidePeriod(date, displayedPeriod)) {
    return (
      <SnackbarAlert
        key={notice.id}
        open
        setOpen={handleSetOpen}
        message={t('event.saved')}
        autoHideDuration={4000}
      />
    )
  }

  const handleShow = (): void => {
    calendarRef.current?.gotoDate(date)
    showEventPreview(notice.event, date)
    closeNotice()
  }
  const formattedDate = formatSavedDate(
    date,
    notice.savedAt,
    timezone,
    t('locale')
  )

  return (
    <SnackbarAlert
      key={notice.id}
      open
      setOpen={handleSetOpen}
      message={t('event.savedFor', { date: formattedDate })}
      autoHideDuration={6000}
      action={
        <Button
          color="secondary"
          variant="text"
          size="small"
          onClick={handleShow}
        >
          {t('actions.show')}
        </Button>
      }
    />
  )
}
