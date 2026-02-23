export function renameDefault(
  davName: string | undefined,
  ownerName: string,
  t: (key: string, params?: object) => string,
  isOwnCalendar?: boolean
) {
  if (!ownerName) {
    if (davName && davName !== "#default") return davName;
  }
  if (!davName) {
    return t("calendar.defaultCalendarName", { name: ownerName });
  }
  if (davName !== "#default") {
    return davName;
  }
  if (isOwnCalendar) {
    return t("calendar.defaultPersonalCalendarName");
  }
  return t("calendar.defaultCalendarName", { name: ownerName });
}
