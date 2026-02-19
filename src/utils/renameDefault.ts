export function renameDefault(
  davName: string | undefined,
  ownerName: string,
  t: (key: string, params?: object) => string,
  isOwnCalendar?: boolean
) {
  if (!davName) {
    return t("calendar.defaultCalendarName", { name: ownerName });
  }
  if (davName !== "#default") {
    return isOwnCalendar ? davName : `${davName} - ${ownerName}`;
  }
  if (isOwnCalendar) {
    return t("calendar.defaultPersonalCalendarName");
  }
  return t("calendar.defaultCalendarName", { name: ownerName });
}
