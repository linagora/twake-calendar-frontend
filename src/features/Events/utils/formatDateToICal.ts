import moment from "moment-timezone";

export function formatDateToICal(
  date: Date,
  allday: boolean,
  timezone?: string
) {
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (allday) {
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    return `${year}-${month}-${day}`;
  }

  if (timezone) {
    if (!moment.tz.zone(timezone)) {
      console.warn(
        `[formatDateToICal] Unrecognized timezone: "${timezone}", falling back to UTC`
      );
    } else {
      const momentDate = moment.utc(date).tz(timezone);
      if (momentDate.isValid()) {
        return momentDate.format("YYYY-MM-DDTHH:mm:ss");
      }
    }
  }

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
}
