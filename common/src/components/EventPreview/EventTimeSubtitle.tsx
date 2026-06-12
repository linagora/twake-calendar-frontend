import { getTimezoneOffset } from '@common/utils/timezone'
import { Typography } from '@linagora/twake-mui'
import { CalendarEvent } from '@common/types/EventsTypes'
import { formatDate } from './utils/formatDate'
import { formatEnd } from './utils/formatEnd'
import { useI18n } from 'twake-i18n'

export const EventTimeSubtitle: React.FC<{
  event: CalendarEvent
  timezone: string
}> = ({ event, timezone }) => {
  const { t } = useI18n()
  const formattedEnd = event.end
    ? formatEnd({
        start: event.start,
        end: event.end,
        t,
        timeZone: timezone,
        allday: event.allday
      })
    : null

  return (
    <Typography sx={{ color: 'text.secondaryContainer' }}>
      {formatDate(event.start, t, timezone, event.allday)}
      {formattedEnd &&
        ` – ${formattedEnd} ${!event.allday ? getTimezoneOffset(timezone, new Date(event.start)) : ''}`}
    </Typography>
  )
}
