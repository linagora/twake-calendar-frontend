export function formatEnd(
  start: Date | string,
  end: Date | string,
  t: (k: string, p?: string | object) => string,
  timeZone: string,
  allday?: boolean
) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const formatDatePart = (d: Date) =>
    d.toLocaleDateString("en-CA", { timeZone }); // YYYY-MM-DD format
  if (allday) {
    const inclusiveEndDate = new Date(endDate);
    inclusiveEndDate.setDate(inclusiveEndDate.getDate() - 1);
    const sameDay =
      formatDatePart(startDate) === formatDatePart(inclusiveEndDate);
    return sameDay
      ? null
      : inclusiveEndDate.toLocaleDateString(t("locale"), {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone,
        });
  } else {
    const sameDay = formatDatePart(startDate) === formatDatePart(endDate);
    if (sameDay) {
      return endDate.toLocaleTimeString(t("locale"), {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone,
      });
    }
    return endDate.toLocaleString(t("locale"), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    });
  }
}
