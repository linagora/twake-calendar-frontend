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
  const formattedEnd = event.end
    ? formatEnd(event.start, event.end, t, timezone, event.allday)
    : null;

  return (
    <Typography color="text.secondaryContainer">
      {formatDate(event.start, t, timezone, event.allday)}
      {formattedEnd &&
        ` – ${formattedEnd} ${!event.allday ? getTimezoneOffset(timezone, new Date(event.start)) : ""}`}
    </Typography>
  );
}
