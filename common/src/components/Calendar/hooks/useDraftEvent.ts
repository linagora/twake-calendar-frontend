import { useAppSelector } from '@common/app/hooks'
import { useDefaultCalendarId } from '@common/features/Calendars/hooks/useDefaultCalendarId'
import { useI18n } from 'twake-i18n'
import type { DateSelectInfo, EventInput } from '@fullcalendar/react'

interface UseDraftEventProps {
  selectedRange?: DateSelectInfo | null
  draftCalendarId?: string | null
  filteredCalendarEvents: EventInput[]
}

export const useDraftEvent = ({
  selectedRange,
  draftCalendarId,
  filteredCalendarEvents
}: UseDraftEventProps): { events: EventInput[] } => {
  const { t } = useI18n()
  const calendars = useAppSelector(state => state.calendars.list)
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''

  const defaultCalendarId = useDefaultCalendarId({
    calList: calendars,
    userId
  })

  const resolvedDraftCalendarId = draftCalendarId || defaultCalendarId

  const events = selectedRange
    ? [
        ...filteredCalendarEvents,
        {
          id: 'twake-draft-event',
          title: t('event.untitled'),
          start: selectedRange.start,
          end: selectedRange.end,
          allDay: selectedRange.allDay,
          calId: resolvedDraftCalendarId
        }
      ]
    : filteredCalendarEvents

  return { events }
}
