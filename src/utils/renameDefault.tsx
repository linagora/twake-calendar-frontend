export function renameDefault(
  davName: string | undefined,
  ownerName: string,
  t: (key: string, params?: object) => string,
  isOwnCalendar?: boolean
) {
  if (davName !== "#default") {
    return davName;
  }
  if (isOwnCalendar) {
    return t("calendar.defaultPersonalCalendarName");
  }
  return t("calendar.defaultCalendarName", { name: ownerName });
}
