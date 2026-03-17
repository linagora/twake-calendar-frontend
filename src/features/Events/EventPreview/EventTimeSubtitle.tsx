import { getTimezoneOffset } from "@/utils/timezone";
import { Typography } from "@linagora/twake-mui";
import { CalendarEvent } from "../EventsTypes";
import { formatDate } from "./utils/formatDate";
import { formatEnd } from "./utils/formatEnd";

export function EventTimeSubtitle({
  event,
  t,
  timezone,
}: {
  event: CalendarEvent;
  t: (k: string, p?: string | object | undefined) => string;
  timezone: string;
}) {
  return (
    <Typography color="text.secondaryContainer">
      {formatDate(event.start, t, timezone, event.allday)}
      {event.end &&
        formatEnd(event.start, event.end, t, timezone, event.allday) &&
        ` – ${formatEnd(event.start, event.end, t, timezone, event.allday)} ${!event.allday ? getTimezoneOffset(timezone, new Date(event.start)) : ""}`}
    </Typography>
  );
}
